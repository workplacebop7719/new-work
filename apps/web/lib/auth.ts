/**
 * Request-time authentication — ADR-0002, ENG-001.
 *
 * What this module does: resolve a cookie to a session, a session to a user, and
 * a user to an `Actor` built from current database rows.
 *
 * What it deliberately does not do: decide anything. Every "may they?" question
 * goes to `can()` in @northstar/auth. A helper here that answered one would be
 * authorization in the presentation layer, which PRD §27 forbids and which is
 * exactly how the second and third enforcement layers get quietly bypassed.
 */
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { can, type Action, type Actor, type Resource } from '@northstar/auth';
import {
  clientHash,
  evaluateSession,
  findAuthSession,
  findUserById,
  listMembershipsForUser,
  loadActor,
  touchAuthSession,
  TOUCH_INTERVAL_MS,
  type AccountUser,
  type AuthSession,
  type MembershipRecord,
} from '@northstar/db';
import type { Role, SessionState } from '@northstar/domain';
import type { Locale } from './i18n';

const SESSION_COOKIE = 'ns_session';
/** Set while a sign-in is part-way through: password accepted, factor pending. */
const PENDING_COOKIE = 'ns_pending';

const BASE_COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env['NODE_ENV'] === 'production',
  path: '/',
} as const;

/**
 * No `maxAge`. The cookie is a session cookie in the browser's sense, and the
 * lifetime that matters is enforced server-side against `auth_sessions` — a
 * cookie that outlives its row is simply an invalid cookie, whereas a cookie
 * with a long `maxAge` and no server check would be a working credential.
 */
export async function writeSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, BASE_COOKIE);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(PENDING_COOKIE);
}

export async function writePendingCookie(value: string): Promise<void> {
  (await cookies()).set(PENDING_COOKIE, value, BASE_COOKIE);
}

export async function readPendingCookie(): Promise<string | undefined> {
  return (await cookies()).get(PENDING_COOKIE)?.value;
}

export async function clearPendingCookie(): Promise<void> {
  (await cookies()).delete(PENDING_COOKIE);
}

/**
 * A daily-rotating HMAC of the client address, for "signed in from somewhere
 * new" — the same construction the rate limiter uses, and for the same reason:
 * the platform should be able to notice a change without holding an IP address.
 */
export async function currentClientHash(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    const address = forwarded || h.get('x-real-ip');
    return address ? clientHash(address, new Date()) : null;
  } catch {
    return null;
  }
}

/**
 * A coarse client label. Deliberately a family name and nothing more: a full
 * user-agent string is a fingerprint, and this only needs to help someone
 * recognize their own device in a list of sessions.
 */
export async function currentUserAgentFamily(): Promise<string | null> {
  const ua = (await headers()).get('user-agent') ?? '';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return ua ? 'Other' : null;
}

export interface Viewer {
  readonly user: AccountUser;
  readonly session: AuthSession;
  readonly actor: Actor;
  readonly memberships: readonly MembershipRecord[];
  readonly roles: readonly Role[];
  /** ACC-004: true inside the window where the interface must warn and offer more time. */
  readonly warnAboutTimeout: boolean;
}

export type ViewerResult =
  | { readonly status: 'anonymous' }
  | { readonly status: 'mfa_required'; readonly session: AuthSession }
  | { readonly status: 'rejected'; readonly reason: SessionState['status'] }
  | ({ readonly status: 'active' } & Viewer);

/**
 * Resolves the current request to a viewer.
 *
 * The order matters: the session is read first, then the user, then the
 * memberships that decide the session policy. A disabled user is rejected even
 * with a live session, because the account lifecycle is a database fact and the
 * session row knows nothing about it.
 */
export async function currentViewer(now: Date = new Date()): Promise<ViewerResult> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { status: 'anonymous' };

  const session = await findAuthSession(token);
  if (!session) return { status: 'anonymous' };

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'active') return { status: 'rejected', reason: 'revoked' };

  const memberships = await listMembershipsForUser(user.id);
  const roles = memberships.map((m) => m.role);
  const { state, warnAboutTimeout } = evaluateSession(session, roles, now);

  if (state.status === 'mfa_required') return { status: 'mfa_required', session };
  if (state.status !== 'active') return { status: 'rejected', reason: state.status };

  // Activity is recorded at most once a minute; see TOUCH_INTERVAL_MS.
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await touchAuthSession(session.id);
  }

  const actor = await loadActor(user.id);
  return { status: 'active', user, session, actor, memberships, roles, warnAboutTimeout };
}

/**
 * Requires an active viewer, or redirects to sign-in.
 *
 * `returnTo` is passed as a path and re-validated on the way back out
 * (`safeReturnTo` in the auth actions), never trusted as given.
 */
export async function requireViewer(locale: Locale, returnTo: string): Promise<Viewer> {
  const result = await currentViewer();
  switch (result.status) {
    case 'active':
      return result;
    case 'mfa_required':
      redirect(`/${locale}/sign-in/verify`);
    // eslint-disable-next-line no-fallthrough -- redirect() never returns
    case 'rejected':
      redirect(`/${locale}/sign-in?ended=${result.reason}&returnTo=${encodeURIComponent(returnTo)}`);
    // eslint-disable-next-line no-fallthrough -- redirect() never returns
    default:
      redirect(`/${locale}/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
}

/**
 * The organization a request is acting in.
 *
 * Someone may belong to several. Until CC-04 gives them a switcher, the first
 * membership is used — and, importantly, it is *read from memberships*, never
 * taken from a query parameter. A tenant id supplied by the caller would make
 * every subsequent policy check a check against a tenant the caller chose.
 */
export function activeOrganization(viewer: Viewer): MembershipRecord | undefined {
  return viewer.memberships[0];
}

export class ForbiddenError extends Error {
  constructor(readonly decision: string) {
    super(decision);
    this.name = 'ForbiddenError';
  }
}

/**
 * The gate every mutating action calls.
 *
 * It is a thin wrapper over `can()` on purpose: the decision lives in the policy
 * layer, and this only supplies the actor and turns a denial into a thrown
 * error. Anything cleverer here would be a second policy implementation.
 */
export function authorize(viewer: Viewer, action: Action, resource: Resource): void {
  const decision = can(viewer.actor, action, resource);
  if (!decision.allowed) {
    throw new ForbiddenError(decision.reason);
  }
}

/** Non-throwing variant, for deciding whether to render a control at all. */
export function permits(viewer: Viewer, action: Action, resource: Resource): boolean {
  return can(viewer.actor, action, resource).allowed;
}

/* -------------------------------------------------------------------------- */
/* Short-lived hand-off cookies                                               */
/* -------------------------------------------------------------------------- */

/**
 * Carries a secret from a server action to the page that renders it.
 *
 * A TOTP setup key and a set of recovery codes both have to survive exactly one
 * redirect. The obvious way to do that is a query parameter, and it is the wrong
 * way: URLs are written to browser history, to server access logs, and to any
 * proxy in between. A hand-off cookie is `httpOnly`, is not logged with the
 * request line, and expires on its own within two minutes.
 *
 * It is not cleared on read — a server component cannot write cookies — so the
 * short lifetime is what bounds it. Two minutes is long enough to reload a page
 * that failed to render and short enough that a shared machine does not keep it.
 */
const HANDOFF_MAX_AGE_SECONDS = 120;

export type HandoffName = 'ns_enrolment' | 'ns_recovery_codes';

export async function writeHandoff(name: HandoffName, value: string): Promise<void> {
  (await cookies()).set(name, value, { ...BASE_COOKIE, maxAge: HANDOFF_MAX_AGE_SECONDS });
}

export async function readHandoff(name: HandoffName): Promise<string | undefined> {
  return (await cookies()).get(name)?.value;
}
