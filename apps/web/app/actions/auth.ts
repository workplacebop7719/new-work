'use server';

/**
 * Authentication server actions — ADR-0002, SEC-002, ACC-009.
 *
 * Every one is a plain form POST target, so sign-in, second-factor verification,
 * enrolment and recovery all work with JavaScript disabled (ARC-006). The
 * `no-javascript` Playwright project proves it on each run — which matters more
 * here than anywhere else in the product, because an inaccessible sign-in gate
 * makes the rest of the accessibility work unreachable.
 *
 * Two rules run through all of it:
 *
 *   1. **No enumeration.** A wrong password, an unknown address and a disabled
 *      account produce the same page and the same wording (threat model T-13).
 *   2. **No single-factor session.** A session row starts with
 *      `mfa_satisfied_at` null and nothing but the challenge can move it, so a
 *      forgotten check produces a session that fails every request.
 */
import { redirect } from 'next/navigation';
import {
  checkSignInThrottle,
  clearFactors,
  clearSignInFailures,
  createAuthSession,
  findUserByEmail,
  findUserById,
  markMfaSatisfied,
  recordFactorEnrolled,
  recordRecoveryCodesIssued,
  recordSignInFailure,
  revokeAllUserSessions,
  revokeAuthSession,
} from '@northstar/db';
import { MFA_METHODS, newCorrelationId, type MfaMethod } from '@northstar/domain';
import { auditAuthEvent } from '@/lib/audit';
import {
  clearPendingCookie,
  clearSessionCookie,
  currentClientHash,
  currentUserAgentFamily,
  currentViewer,
  readPendingCookie,
  requireViewer,
  writeHandoff,
  writePendingCookie,
  writeSessionCookie,
} from '@/lib/auth';
import { isLocale, type Locale } from '@/lib/i18n';
import { integrations } from '@/lib/integrations';
import { enforceRateLimit } from '@/lib/rate-limit';

function safeLocale(value: FormDataEntryValue | null): Locale {
  const raw = typeof value === 'string' ? value : 'en';
  return isLocale(raw) ? raw : 'en';
}

/**
 * The same validation the qualifier's consent form uses. Repeated rather than
 * shared-by-accident: an open redirect on a sign-in return path is worth more to
 * an attacker than one on a consent form, so it gets its own explicit copy and
 * its own test.
 */
function safeReturnTo(value: FormDataEntryValue | null, locale: Locale): string {
  const home = `/${locale}/account`;
  if (typeof value !== 'string') return home;
  if (value.includes('\\') || value.includes(':')) return home;
  return /^\/(en|fr)(\/|\?|$)/.test(value) ? value : home;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isMfaMethod(value: string): value is MfaMethod {
  return (MFA_METHODS as readonly string[]).includes(value);
}

/**
 * A pending sign-in, carried between the password step and the factor step.
 *
 * It holds the provider's challenge id and the user id, in an httpOnly cookie.
 * It is not a session and grants nothing: `currentViewer` never looks at it, and
 * the only thing that reads it is the verification action below.
 */
function packPending(challengeId: string, userId: string): string {
  return `${challengeId}::${userId}`;
}

function unpackPending(value: string | undefined): { challengeId: string; userId: string } | null {
  const [challengeId, userId] = (value ?? '').split('::');
  return challengeId && userId ? { challengeId, userId } : null;
}

/* -------------------------------------------------------------------------- */
/* Sign in                                                                    */
/* -------------------------------------------------------------------------- */

export async function signIn(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = safeReturnTo(formData.get('returnTo'), locale);
  const email = text(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const correlationId = newCorrelationId();

  await enforceRateLimit('sign_in', locale);

  // Annotated on the variable, not only on the arrow: TypeScript narrows after
  // a `never`-returning call only when the binding itself declares that type.
  const fail: (reason: 'credentials' | 'locked') => never = (reason) =>
    redirect(`/${locale}/sign-in?error=${reason}&returnTo=${encodeURIComponent(returnTo)}`);

  if (!email || !password) fail('credentials');

  // Checked before the provider is called: a locked address costs an attacker a
  // database read rather than a provider request.
  const throttle = await checkSignInThrottle(email);
  if (throttle.lockedOut) {
    await auditAuthEvent({
      action: 'auth.account_locked',
      actorId: null,
      objectType: 'sign_in',
      objectId: null,
      correlationId,
      context: { failedAttempts: throttle.failedAttempts },
    });
    fail('locked');
  }

  const challenge = await integrations().identity.beginSignIn({ email, password });

  if (challenge.outcome === 'rejected') {
    const after = await recordSignInFailure(email);
    await auditAuthEvent({
      action: 'auth.sign_in_failed',
      // Null even when the address matches a user: recording the user id here
      // would turn the audit log into a list of which addresses are real.
      actorId: null,
      objectType: 'sign_in',
      objectId: null,
      correlationId,
      context: { failedAttempts: after.failedAttempts },
    });
    fail('credentials');
  }

  // The provider says these credentials are good. The platform still needs a
  // user row: an account that exists at the provider but not here is not a user
  // of this product, and must not become one by signing in.
  const user = await findUserByEmail(email);
  if (!user || user.status !== 'active' || user.identitySubjectId !== challenge.subjectId) {
    await recordSignInFailure(email);
    await auditAuthEvent({
      action: 'auth.sign_in_failed',
      actorId: null,
      objectType: 'sign_in',
      objectId: null,
      correlationId,
      context: { reason: 'no_active_platform_account' },
    });
    fail('credentials');
  }

  await clearSignInFailures(email);
  await writePendingCookie(packPending(challenge.challengeId, user.id));

  if (challenge.outcome === 'enrolment_required') {
    redirect(`/${locale}/sign-in/enrol?returnTo=${encodeURIComponent(returnTo)}`);
  }
  redirect(`/${locale}/sign-in/verify?returnTo=${encodeURIComponent(returnTo)}`);
}

/**
 * Verifies the second factor and issues the session.
 *
 * The session row is created here and marked as having satisfied MFA in the
 * same request. Creating it earlier — at the password step — would put a
 * half-authenticated session cookie in the browser, which is a credential
 * waiting for a bug to promote it.
 */
export async function verifySecondFactor(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = safeReturnTo(formData.get('returnTo'), locale);
  const code = text(formData, 'code');
  const rawMethod = text(formData, 'method') || 'totp';
  const correlationId = newCorrelationId();

  await enforceRateLimit('sign_in', locale);

  const pending = unpackPending(await readPendingCookie());
  if (!pending || !isMfaMethod(rawMethod)) {
    redirect(`/${locale}/sign-in?error=expired`);
  }

  const result = await integrations().identity.verifySecondFactor({
    challengeId: pending.challengeId,
    method: rawMethod,
    code,
  });

  if (result.outcome === 'challenge_expired') {
    await clearPendingCookie();
    redirect(`/${locale}/sign-in?error=expired`);
  }
  if (result.outcome === 'rejected') {
    await auditAuthEvent({
      action: 'auth.mfa_challenge_failed',
      actorId: pending.userId,
      objectType: 'sign_in',
      objectId: null,
      correlationId,
      context: { method: rawMethod },
    });
    // The challenge is single-use at the provider, so a rejected attempt needs a
    // fresh one. Sending the person back to the password step is the honest
    // outcome, and the page explains it rather than silently emptying the field.
    await clearPendingCookie();
    redirect(`/${locale}/sign-in?error=code&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const clientHash = await currentClientHash();
  const userAgentFamily = await currentUserAgentFamily();
  const { token, session } = await createAuthSession({
    userId: pending.userId,
    clientHash,
    userAgentFamily,
  });
  await markMfaSatisfied(session.id, result.method);
  await writeSessionCookie(token);
  await clearPendingCookie();

  await auditAuthEvent({
    action: 'auth.sign_in_succeeded',
    actorId: pending.userId,
    objectType: 'auth_session',
    objectId: session.id,
    correlationId,
    context: { method: result.method, client: userAgentFamily ?? 'unknown' },
  });

  redirect(returnTo);
}

/* -------------------------------------------------------------------------- */
/* Enrolment                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Starts an enrolment and hands the offer to the page that will render it.
 *
 * Only the enrolment id — a provider handle, not a secret — travels in the URL.
 * The TOTP seed goes in a two-minute `httpOnly` hand-off cookie, because a
 * query parameter would put a live authentication secret into browser history
 * and into every access log between here and the browser.
 */
export async function beginEnrolment(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = safeReturnTo(formData.get('returnTo'), locale);
  const rawMethod = text(formData, 'method') || 'totp';
  const during = text(formData, 'during') === 'sign_in';

  await enforceRateLimit('account_security', locale);
  if (!isMfaMethod(rawMethod) || rawMethod === 'recovery_code') {
    redirect(`/${locale}/account/security?error=method`);
  }

  const subjectId = await subjectForEnrolment(locale, during, returnTo);
  const offer = await integrations().identity.beginEnrolment({
    subjectId: subjectId.subjectId,
    method: rawMethod,
    accountLabel: subjectId.email,
  });

  await writeHandoff(
    'ns_enrolment',
    JSON.stringify({
      enrolmentId: offer.enrolmentId,
      method: offer.method,
      provisioningUri: offer.provisioningUri,
      manualEntrySecret: offer.manualEntrySecret,
    }),
  );

  const target = during
    ? `/${locale}/sign-in/enrol?enrolment=${encodeURIComponent(offer.enrolmentId)}`
    : `/${locale}/account/security?enrolment=${encodeURIComponent(offer.enrolmentId)}`;
  const params = during ? `&returnTo=${encodeURIComponent(returnTo)}` : '';
  redirect(`${target}${params}`);
}

export async function confirmEnrolment(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = safeReturnTo(formData.get('returnTo'), locale);
  const enrolmentId = text(formData, 'enrolment');
  const code = text(formData, 'code');
  const rawMethod = text(formData, 'method') || 'totp';
  const during = text(formData, 'during') === 'sign_in';
  const correlationId = newCorrelationId();

  await enforceRateLimit('account_security', locale);
  if (!isMfaMethod(rawMethod) || rawMethod === 'recovery_code') {
    redirect(`/${locale}/account/security?error=method`);
  }

  const subject = await subjectForEnrolment(locale, during, returnTo);
  const result = await integrations().identity.confirmEnrolment({ enrolmentId, code });
  if (!result.enrolled) {
    const back = during ? `/${locale}/sign-in/enrol` : `/${locale}/account/security`;
    redirect(`${back}?error=code`);
  }

  await recordFactorEnrolled({
    userId: subject.userId,
    method: rawMethod,
    label: rawMethod === 'totp' ? 'Authenticator app' : 'Passkey',
  });
  await auditAuthEvent({
    action: 'auth.mfa_enrolled',
    actorId: subject.userId,
    objectType: 'mfa_factor',
    objectId: rawMethod,
    correlationId,
    context: { method: rawMethod },
  });

  if (during) {
    // Enrolment during sign-in does not by itself produce a session — the person
    // signs in again with the factor they just enrolled. One extra step, and it
    // means no code path creates a session outside `verifySecondFactor`.
    await clearPendingCookie();
    redirect(`/${locale}/sign-in?enrolled=1&returnTo=${encodeURIComponent(returnTo)}`);
  }
  redirect(`/${locale}/account/security?enrolled=${rawMethod}`);
}

/**
 * Resolves whose enrolment this is.
 *
 * Two callers: someone signed in and managing their account, and someone
 * part-way through a sign-in with no factor yet. The second reads the pending
 * cookie — which is why that cookie holds a user id rather than a role or a
 * permission: it identifies, it does not authorize.
 */
async function subjectForEnrolment(
  locale: Locale,
  during: boolean,
  returnTo: string,
): Promise<{ userId: string; subjectId: string; email: string }> {
  if (during) {
    const pending = unpackPending(await readPendingCookie());
    if (!pending) redirect(`/${locale}/sign-in?error=expired`);
    const user = await findUserById(pending.userId);
    if (!user?.identitySubjectId) redirect(`/${locale}/sign-in?error=expired`);
    return { userId: user.id, subjectId: user.identitySubjectId, email: user.email };
  }
  const viewer = await requireViewer(locale, returnTo);
  if (!viewer.user.identitySubjectId) redirect(`/${locale}/sign-in?error=expired`);
  return {
    userId: viewer.user.id,
    subjectId: viewer.user.identitySubjectId,
    email: viewer.user.email,
  };
}

/* -------------------------------------------------------------------------- */
/* Recovery codes                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Issues a fresh set of recovery codes.
 *
 * The codes are shown once and are never stored by this platform — only the
 * *date* they were issued is recorded, so the account screen can say how old
 * they are.
 */
export async function issueRecoveryCodes(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  await enforceRateLimit('account_security', locale);
  const viewer = await requireViewer(locale, `/${locale}/account/security`);
  if (!viewer.user.identitySubjectId) redirect(`/${locale}/sign-in?error=expired`);

  const codes = await integrations().identity.issueRecoveryCodes(viewer.user.identitySubjectId);
  await recordRecoveryCodesIssued(viewer.user.id);
  // Same reasoning as the enrolment seed, more urgently: these are ten live
  // credentials, and a query parameter would write them to history and to logs.
  await writeHandoff('ns_recovery_codes', codes.join(','));
  await auditAuthEvent({
    action: 'auth.recovery_codes_issued',
    actorId: viewer.user.id,
    objectType: 'recovery_codes',
    objectId: viewer.user.id,
    context: { count: codes.length },
  });

  redirect(`/${locale}/account/security?codes=1`);
}

/**
 * Redeems a recovery code.
 *
 * Redeeming does not sign anyone in. It clears the enrolled factors and returns
 * the account to enrolment, because the situation it exists for is "I no longer
 * have the device" — and the fix for that is enrolling a new one, not being let
 * in without a factor.
 */
export async function redeemRecoveryCode(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const email = text(formData, 'email').toLowerCase();
  const code = text(formData, 'code');
  const correlationId = newCorrelationId();

  await enforceRateLimit('account_security', locale);

  const throttle = await checkSignInThrottle(email);
  if (throttle.lockedOut) redirect(`/${locale}/sign-in/recover?error=locked`);

  const result = await integrations().identity.redeemRecoveryCode({ email, code });
  if (!result.redeemed || !result.subjectId) {
    await recordSignInFailure(email);
    redirect(`/${locale}/sign-in/recover?error=code`);
  }

  const user = await findUserByEmail(email);
  if (user) {
    // The provider has cleared its factors; the platform's mirror must follow,
    // and every existing session ends. Someone using a recovery code has lost
    // control of a device, so the sessions that device may hold must go.
    await clearFactors(user.id);
    await revokeAllUserSessions(user.id, 'recovery_used');
    await auditAuthEvent({
      action: 'auth.recovery_code_redeemed',
      actorId: user.id,
      objectType: 'recovery_codes',
      objectId: user.id,
      correlationId,
      context: {},
    });
  }

  redirect(`/${locale}/sign-in?recovered=1`);
}

/* -------------------------------------------------------------------------- */
/* Sign out                                                                   */
/* -------------------------------------------------------------------------- */

export async function signOut(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const everywhere = text(formData, 'scope') === 'everywhere';

  const result = await currentViewer();
  if (result.status === 'active') {
    if (everywhere) {
      await revokeAllUserSessions(result.user.id, 'signed_out_everywhere');
      await auditAuthEvent({
        action: 'auth.sessions_revoked',
        actorId: result.user.id,
        objectType: 'auth_session',
        objectId: null,
        context: { scope: 'everywhere' },
      });
    } else {
      await revokeAuthSession(result.session.id, 'signed_out');
      await auditAuthEvent({
        action: 'auth.signed_out',
        actorId: result.user.id,
        objectType: 'auth_session',
        objectId: result.session.id,
        context: {},
      });
    }
  }

  await clearSessionCookie();
  redirect(`/${locale}`);
}

/**
 * Extends the session in response to the ACC-004 timeout warning.
 *
 * A plain form POST, so "give me more time" works without JavaScript. The
 * accessibility criterion behind ACC-004 asks for the ability to extend; a
 * warning with no way to act on it is the failure that criterion is about.
 * (northstar-allow-regulatory: naming the standard we build to, in engineering
 * prose. Nothing here reaches a reader, and no obligation is asserted about any
 * client's organization — the guard's real target.)
 */
export async function extendSession(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = safeReturnTo(formData.get('returnTo'), locale);
  // Resolving the viewer is what records activity — `currentViewer` touches the
  // session — so the extension is a side effect of answering "who is this?".
  // The action exists so that the warning's button has somewhere to post to
  // without JavaScript.
  await currentViewer();
  redirect(returnTo);
}
