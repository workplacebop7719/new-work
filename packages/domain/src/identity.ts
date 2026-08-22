/**
 * Identity rules — PRD §15 Authentication, §16 Identity, §18 Role model.
 *
 * ADR-0002 splits authentication from authorization. Credentials, MFA secrets
 * and recovery codes live with the identity provider behind `IdentityPort`;
 * what lives here is everything the *product* decides: how long a session may
 * last, which roles need a phishing-resistant factor, who may invite whom, and
 * when an organization may be left without an administrator.
 *
 * None of it is an entitlement. "May this actor invite an administrator?" is a
 * policy question answered in @northstar/auth (ENG-001). What this module
 * answers is the narrower structural question — "is `internal_pm` a role a
 * client administrator is even allowed to name?" — which the policy layer then
 * builds on.
 */
import { z } from 'zod';
import { CLIENT_ROLES, INTERNAL_ROLES, type Role } from './roles';

/* -------------------------------------------------------------------------- */
/* Sessions                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Two clocks, both enforced server-side on every request.
 *
 * `idleMs` is the gap after which an unused session stops working. `absoluteMs`
 * is the ceiling regardless of activity, so a stolen session token has a bounded
 * life even while it is being used (SEC-002).
 *
 * ACC-004 is why these are not shorter: WCAG 2.2 requires that a timeout either
 * be at least 20 hours or be warnable and extendable. Twelve hours of idle for
 * a client user with a warning, and a long absolute ceiling, means someone using
 * a screen reader to work through a 60-item evidence checklist is not signed out
 * mid-task. Privileged internal sessions trade that comfort for blast radius.
 */
export interface SessionPolicy {
  readonly idleMs: number;
  readonly absoluteMs: number;
  /** How many milliseconds before idle expiry the interface must warn (ACC-004). */
  readonly warnBeforeMs: number;
  readonly mfa: MfaRequirement;
}

const HOUR = 60 * 60 * 1000;

const CLIENT_SESSION: SessionPolicy = {
  idleMs: 12 * HOUR,
  absoluteMs: 24 * HOUR * 7,
  warnBeforeMs: 5 * 60 * 1000,
  mfa: 'any_factor',
};

const PRIVILEGED_SESSION: SessionPolicy = {
  // The internal console can reach every tenant's data by design (§11), so its
  // sessions are short. The warning window is longer, not shorter, because the
  // interruption is more frequent.
  idleMs: 2 * HOUR,
  absoluteMs: 12 * HOUR,
  warnBeforeMs: 10 * 60 * 1000,
  mfa: 'phishing_resistant',
};

/**
 * SEC-002: MFA for all accounts, phishing-resistant for privileged roles.
 *
 * `any_factor` is not "weak": it includes TOTP with paste allowed and
 * password-manager support, which ACC-009 requires and which SMS does not
 * provide. What it excludes is nothing — it is the floor, not a preference.
 */
export const MFA_REQUIREMENTS = ['any_factor', 'phishing_resistant'] as const;
export type MfaRequirement = (typeof MFA_REQUIREMENTS)[number];

export const PRIVILEGED_ROLES: readonly Role[] = INTERNAL_ROLES;

export function isPrivilegedRole(role: Role): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

/**
 * The policy for a user is the strictest one any of their roles demands.
 *
 * A person who is both an internal reviewer and an administrator of their own
 * organization gets the privileged policy everywhere, not the privileged policy
 * only while looking at internal screens. Session strength is a property of the
 * session, and a session cannot be partly short-lived.
 */
export function sessionPolicyFor(roles: readonly Role[]): SessionPolicy {
  return roles.some(isPrivilegedRole) ? PRIVILEGED_SESSION : CLIENT_SESSION;
}

export interface SessionTimes {
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  /** Null until the second factor has been satisfied for this session. */
  readonly mfaSatisfiedAt: Date | null;
  readonly revokedAt: Date | null;
}

export type SessionState =
  | { readonly status: 'active' }
  | { readonly status: 'mfa_required' }
  | { readonly status: 'expired'; readonly cause: 'idle' | 'absolute' }
  | { readonly status: 'revoked' };

/**
 * Whether a session may serve a request.
 *
 * Revocation is checked before expiry so that a revoked session reports itself
 * as revoked rather than as idle — the audit trail and the sign-in screen say
 * different things for the two, and telling someone "your session timed out"
 * when an administrator removed them is a lie the interface should not tell.
 */
export function sessionState(times: SessionTimes, policy: SessionPolicy, now: Date): SessionState {
  if (times.revokedAt !== null && times.revokedAt.getTime() <= now.getTime()) {
    return { status: 'revoked' };
  }
  if (now.getTime() - times.createdAt.getTime() >= policy.absoluteMs) {
    return { status: 'expired', cause: 'absolute' };
  }
  if (now.getTime() - times.lastSeenAt.getTime() >= policy.idleMs) {
    return { status: 'expired', cause: 'idle' };
  }
  if (times.mfaSatisfiedAt === null) {
    return { status: 'mfa_required' };
  }
  return { status: 'active' };
}

/** True inside the window where ACC-004 requires a visible, extendable warning. */
export function shouldWarnAboutTimeout(
  times: SessionTimes,
  policy: SessionPolicy,
  now: Date,
): boolean {
  if (sessionState(times, policy, now).status !== 'active') return false;
  const idleExpiresAt = times.lastSeenAt.getTime() + policy.idleMs;
  return idleExpiresAt - now.getTime() <= policy.warnBeforeMs;
}

/* -------------------------------------------------------------------------- */
/* Sign-in throttling                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Credential stuffing is the expected attack (threat model T-14). The response
 * is a delay, never a puzzle: ACC-005 and PRD §27 make an inaccessible barrier
 * the wrong answer to abuse, and a CAPTCHA is exactly that.
 *
 * The lockout is per account and time-boxed rather than permanent, because a
 * permanent lock is a denial-of-service anyone can trigger against a known
 * address.
 */
export const SIGN_IN_ATTEMPT_LIMIT = 10;
export const SIGN_IN_LOCKOUT_MS = 15 * 60 * 1000;

export function isLockedOut(
  failedAttempts: number,
  lastFailureAt: Date | null,
  now: Date,
): boolean {
  if (failedAttempts < SIGN_IN_ATTEMPT_LIMIT || lastFailureAt === null) return false;
  return now.getTime() - lastFailureAt.getTime() < SIGN_IN_LOCKOUT_MS;
}

/* -------------------------------------------------------------------------- */
/* Multi-factor enrolment                                                     */
/* -------------------------------------------------------------------------- */

export const MFA_METHODS = ['totp', 'passkey', 'recovery_code'] as const;
export type MfaMethod = (typeof MFA_METHODS)[number];

/**
 * Which methods satisfy which requirement.
 *
 * A recovery code satisfies neither on its own — it is the escape hatch that
 * gets someone back to enrolment, not a factor they may live on. Redeeming one
 * puts the account into re-enrolment, which is why it is absent from both sets.
 */
const SATISFYING_METHODS: Readonly<Record<MfaRequirement, readonly MfaMethod[]>> = {
  any_factor: ['totp', 'passkey'],
  phishing_resistant: ['passkey'],
};

export function methodSatisfies(method: MfaMethod, requirement: MfaRequirement): boolean {
  return SATISFYING_METHODS[requirement].includes(method);
}

/**
 * ACC-009 requires an alternative verification method, so a single enrolled
 * factor is a half-finished enrolment. The product asks for two before it calls
 * anyone enrolled, and recovery codes are issued alongside — a person who loses
 * a phone must not have to phone a support line that does not exist yet.
 */
export const RECOVERY_CODE_COUNT = 10;
export const MIN_ENROLLED_FACTORS = 2;

export function enrolmentComplete(
  methods: readonly MfaMethod[],
  requirement: MfaRequirement,
): boolean {
  const satisfying = methods.filter((m) => methodSatisfies(m, requirement));
  return satisfying.length >= MIN_ENROLLED_FACTORS;
}

/* -------------------------------------------------------------------------- */
/* Passwords                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Length, and a check against what this person has already told us. Nothing else.
 *
 * Composition rules ("one uppercase, one symbol") were removed from NIST SP
 * 800-63B for good reason: they push people toward `Password1!` and toward
 * writing it down, and they are hostile to anyone typing with a switch device or
 * dictating to a voice interface. ACC-009 requires password-manager support and
 * paste, which is the control that actually produces strong passwords.
 *
 * The one substantive check is that the password is not the address, the name or
 * the organization — the guesses an attacker who has read the sign-up form makes
 * first. A real breached-password corpus is a provider capability (Q-13); this
 * is the floor the platform enforces regardless of which provider is chosen.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

export const PASSWORD_PROBLEMS = ['too_short', 'too_long', 'contains_personal_detail'] as const;
export type PasswordProblem = (typeof PASSWORD_PROBLEMS)[number];

export function passwordProblems(
  password: string,
  personalDetails: readonly string[] = [],
): readonly PasswordProblem[] {
  const problems: PasswordProblem[] = [];
  // Counted in code points, not UTF-16 units: a passphrase written in a script
  // outside the basic plane must not be judged twice as long as it reads.
  const length = [...password].length;
  if (length < PASSWORD_MIN_LENGTH) problems.push('too_short');
  // An upper bound only because unbounded input is a denial-of-service surface
  // against the hashing function, not because long passphrases are unwelcome.
  if (length > PASSWORD_MAX_LENGTH) problems.push('too_long');

  const lowered = password.toLowerCase();
  const matchesDetail = personalDetails.some((detail) => {
    const candidate = detail.trim().toLowerCase();
    return candidate.length >= 4 && lowered.includes(candidate);
  });
  if (matchesDetail) problems.push('contains_personal_detail');

  return problems;
}

/* -------------------------------------------------------------------------- */
/* Invitations                                                                */
/* -------------------------------------------------------------------------- */

/** CLP-013: invitations are single-use and expire. Seven days is a working week. */
export const INVITATION_TTL_MS = 7 * 24 * HOUR;

export const INVITATION_STATES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationState = (typeof INVITATION_STATES)[number];

export interface InvitationTimes {
  readonly createdAt: Date;
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
}

export function invitationState(times: InvitationTimes, now: Date): InvitationState {
  if (times.revokedAt !== null) return 'revoked';
  if (times.acceptedAt !== null) return 'accepted';
  if (now.getTime() - times.createdAt.getTime() >= INVITATION_TTL_MS) return 'expired';
  return 'pending';
}

/**
 * Which roles a holder of `inviterRole` may name in an invitation.
 *
 * This is privilege-escalation containment, and it is a structural rule rather
 * than a policy one: a client administrator inviting an `internal_pm` would give
 * an outsider a role whose policy grants cross-project internal access. No
 * amount of "but they are an admin" makes that the right answer, so the role is
 * not in the set at all.
 *
 * Contractors are absent from every set on purpose. A contractor is never a
 * member of a client tenant (CTR-004); they receive per-assignment grants in
 * CC-06, through a different path entirely.
 */
export function invitableRoles(inviterRole: Role): readonly Role[] {
  switch (inviterRole) {
    case 'client_admin':
      return CLIENT_ROLES;
    case 'internal_pm':
      // Internal staff onboard client organizations during CC-03's assisted
      // sign-up, so they may seat client roles — but not their own.
      return CLIENT_ROLES;
    case 'platform_admin':
      return [...CLIENT_ROLES, ...INTERNAL_ROLES];
    default:
      return [];
  }
}

export function canInviteRole(inviterRole: Role, invitedRole: Role): boolean {
  return invitableRoles(inviterRole).includes(invitedRole);
}

/**
 * An organization must always have at least one administrator.
 *
 * Without this rule the failure is quiet and unrecoverable by the client: the
 * last administrator changes their own role to executive, and nobody in the
 * organization can invite anyone or restore the role. Recovery would mean a
 * support request to a team that, per §21, is fractional.
 */
export function wouldOrphanOrganization(
  currentRoles: readonly { readonly userId: string; readonly role: Role }[],
  change: { readonly userId: string; readonly newRole: Role | null },
): boolean {
  const remaining = currentRoles
    .map((m) => (m.userId === change.userId ? { userId: m.userId, role: change.newRole } : m))
    .filter((m): m is { userId: string; role: Role } => m.role !== null);
  return !remaining.some((m) => m.role === 'client_admin');
}

/* -------------------------------------------------------------------------- */
/* Sign-up                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What a person types to create an organization.
 *
 * Employee count is a band here as it is everywhere else (A-03). There is no
 * field for a phone number, a job title or an industry: each would be a fair
 * question for a salesperson to ask and an unnecessary one for a database to
 * hold before the relationship exists (§3, minimum necessary data).
 */
export const signUpInput = z.object({
  organizationLegalName: z.string().trim().min(2).max(300),
  organizationType: z.string().min(1),
  employeeBand: z.string().min(1),
  jurisdiction: z.string().regex(/^[A-Z]{2}-[A-Z]{2,3}$/),
  displayName: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  preferredLanguage: z.enum(['en', 'fr']),
  /** CNV-004: an explicit, unticked-by-default choice, stored with the record. */
  marketingConsent: z.boolean().default(false),
});
export type SignUpInput = z.infer<typeof signUpInput>;
export type SignUpFields = z.input<typeof signUpInput>;

/**
 * The role the person who creates an organization receives.
 *
 * Named rather than inlined so that the seed, the sign-up action and the tests
 * cannot disagree about it.
 */
export const FOUNDING_ROLE: Role = 'client_admin';
