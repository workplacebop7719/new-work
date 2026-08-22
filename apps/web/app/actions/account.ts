'use server';

/**
 * Organization and team actions — CLP-001, CLP-013, PUB-003.
 *
 * Every mutating action here follows the same four steps, in this order:
 *
 *   1. rate limit (an anonymous or cheap-to-repeat endpoint is an abuse surface)
 *   2. resolve the viewer from the session
 *   3. `authorize()` — the policy layer decides, not this file
 *   4. write, with the audit event in the same database transaction
 *
 * Step 3 is not optional anywhere, including on paths where the page that
 * rendered the form already hid the control. A hidden button is presentation
 * (ENG-001); the form still exists and can still be posted to.
 */
import { redirect } from 'next/navigation';
import {
  acceptInvitation,
  changeMembership,
  createInvitation,
  createUser,
  findUserByEmail,
  LastAdministratorError,
  linkIdentitySubject,
  listTeam,
  provisionOrganization,
  revokeAllUserSessions,
  revokeInvitation,
  updateOrganizationProfile,
} from '@northstar/db';
import {
  canInviteRole,
  EMPLOYEE_BANDS,
  newCorrelationId,
  ORGANIZATION_TYPES,
  passwordProblems,
  ROLES,
  signUpInput,
  type EmployeeBand,
  type Role,
} from '@northstar/domain';
import { activeOrganization, authorize, requireViewer } from '@/lib/auth';
import { isLocale, type Locale } from '@/lib/i18n';
import { integrations, usingFakeIdentity } from '@/lib/integrations';
import { enforceRateLimit } from '@/lib/rate-limit';

function safeLocale(value: FormDataEntryValue | null): Locale {
  const raw = typeof value === 'string' ? value : 'en';
  return isLocale(raw) ? raw : 'en';
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function isBand(value: string): value is EmployeeBand {
  return (EMPLOYEE_BANDS as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Sign up                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Creates an organization and its first administrator.
 *
 * Everything the platform owns — user, organization, membership, the consent
 * record and any outbound message — commits in **one** transaction
 * (`provisionOrganization`). The only step outside it is creating the provider
 * subject, which is unavoidable because the user row needs its id, and which is
 * idempotent on the address so a retry reuses it rather than orphaning one.
 */
export async function signUp(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  await enforceRateLimit('sign_up', locale);

  const password = String(formData.get('password') ?? '');
  const fields = {
    organizationLegalName: text(formData, 'organizationLegalName'),
    organizationType: text(formData, 'organizationType'),
    employeeBand: text(formData, 'employeeBand'),
    jurisdiction: text(formData, 'jurisdiction') || 'CA-ON',
    displayName: text(formData, 'displayName'),
    email: text(formData, 'email'),
    preferredLanguage: locale,
    marketingConsent: formData.get('marketingConsent') === 'on',
  };

  const parsed = signUpInput.safeParse(fields);
  // Annotated on the variable so TypeScript narrows after each call; an arrow
  // whose return type is only on the arrow does not narrow the caller.
  const fail: (error: string) => never = (error) =>
    redirect(`/${locale}/sign-up?error=${error}`);

  if (!parsed.success) fail('details');
  const { employeeBand, organizationType } = parsed.data;
  if (!isBand(employeeBand)) fail('details');
  if (!(ORGANIZATION_TYPES as readonly string[]).includes(organizationType)) fail('details');

  // The password is checked here as well as at the provider so the message is
  // ours, in the person's language, attached to the field (accessible
  // validation, PRD §9) rather than a translated vendor string.
  const problems = passwordProblems(password, [
    parsed.data.email,
    parsed.data.displayName,
    parsed.data.organizationLegalName,
  ]);
  if (problems.length > 0) fail(`password_${problems[0]}`);

  // An address that already has an account is not told so here. The sign-up page
  // reports success either way and the existing account receives no new
  // membership — otherwise this form is an account-enumeration oracle.
  const existing = await findUserByEmail(parsed.data.email);
  if (existing) redirect(`/${locale}/sign-up/check-your-email`);

  const correlationId = newCorrelationId();
  const identity = integrations().identity;
  const subject = await identity.createSubject(
    {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      locale: parsed.data.preferredLanguage,
    },
    { idempotencyKey: `signup:${parsed.data.email}` },
  );
  await identity.setPassword({ subjectId: subject.externalId, password });

  await provisionOrganization({
    legalName: parsed.data.organizationLegalName,
    organizationType,
    employeeBand,
    jurisdiction: parsed.data.jurisdiction,
    preferredLanguage: parsed.data.preferredLanguage,
    founder: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      identitySubjectId: subject.externalId,
    },
    // The checkbox on the form now reaches a consent register and, only when
    // it is ticked, an outbound CRM message. Before this it was parsed and
    // dropped, which made the control a lie.
    marketingConsent: parsed.data.marketingConsent,
    correlationId,
  });

  // No session is created. The person signs in, which sends them through
  // enrolment — so an account cannot exist for a moment in a state where it has
  // a session and no second factor.
  redirect(`/${locale}/sign-in?created=1`);
}

/* -------------------------------------------------------------------------- */
/* Organization profile                                                       */
/* -------------------------------------------------------------------------- */

export async function updateOrganization(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = `/${locale}/organization`;
  const viewer = await requireViewer(locale, returnTo);
  const membership = activeOrganization(viewer);
  if (!membership) redirect(`/${locale}/account`);

  authorize(viewer, 'update', {
    class: 'organization',
    organizationId: membership.organizationId,
    id: membership.organizationId,
  });

  const legalName = text(formData, 'legalName');
  const organizationType = text(formData, 'organizationType');
  const employeeBand = text(formData, 'employeeBand');
  const jurisdiction = text(formData, 'jurisdiction');

  if (
    legalName.length < 2 ||
    !isBand(employeeBand) ||
    !(ORGANIZATION_TYPES as readonly string[]).includes(organizationType) ||
    !/^[A-Z]{2}-[A-Z]{2,3}$/.test(jurisdiction)
  ) {
    redirect(`${returnTo}?error=details`);
  }

  await updateOrganizationProfile({
    organizationId: membership.organizationId,
    legalName,
    organizationType,
    employeeBand,
    jurisdiction,
    preferredLanguage: viewer.user.preferredLanguage,
  });
  redirect(`${returnTo}?saved=1`);
}

/* -------------------------------------------------------------------------- */
/* Team                                                                       */
/* -------------------------------------------------------------------------- */

export async function inviteMember(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = `/${locale}/organization/team`;
  const viewer = await requireViewer(locale, returnTo);
  const membership = activeOrganization(viewer);
  if (!membership) redirect(`/${locale}/account`);

  authorize(viewer, 'create', {
    class: 'invitation',
    organizationId: membership.organizationId,
  });

  const email = text(formData, 'email').toLowerCase();
  const role = text(formData, 'role');
  if (!email.includes('@') || !isRole(role)) redirect(`${returnTo}?error=details`);

  // Two separate questions, both required. The policy layer answered "may this
  // actor invite at all?"; `canInviteRole` answers "is this a role their own
  // role is permitted to name?" — the privilege-escalation containment.
  if (!canInviteRole(membership.role, role)) redirect(`${returnTo}?error=role`);

  // The invitation row and the intent to email it commit together. Sent
  // directly, a mail-provider outage would leave an invitation nobody was ever
  // told about — a row that looks correct and does nothing.
  const { acceptUrl } = await createInvitation({
    organizationId: membership.organizationId,
    email,
    role,
    invitedByUserId: viewer.user.id,
    correlationId: newCorrelationId(),
    acceptUrlFor: (issued) => `/${locale}/join?token=${encodeURIComponent(issued)}`,
    locale,
  });

  // A local build has no mail server, so the link would otherwise be
  // unreachable and the acceptance flow untestable. Shown once, on the page that
  // created it, and only when the fakes are the integrations actually in use —
  // the same condition and the same reasoning as the demo accounts panel.
  const localLink =
    usingFakeIdentity() && acceptUrl ? `&link=${encodeURIComponent(acceptUrl)}` : '';
  redirect(`${returnTo}?invited=1${localLink}`);
}

export async function revokeMemberInvitation(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = `/${locale}/organization/team`;
  const viewer = await requireViewer(locale, returnTo);
  const membership = activeOrganization(viewer);
  if (!membership) redirect(`/${locale}/account`);

  const invitationId = text(formData, 'invitationId');
  authorize(viewer, 'update', {
    class: 'invitation',
    organizationId: membership.organizationId,
    id: invitationId,
  });

  await revokeInvitation({
    organizationId: membership.organizationId,
    invitationId,
    revokedByUserId: viewer.user.id,
    correlationId: newCorrelationId(),
  });
  redirect(`${returnTo}?revoked=1`);
}

/**
 * Changes or removes a membership.
 *
 * Removing someone also ends their sessions. Without that, "revoke access" would
 * mean "revoke access the next time they sign in", and SEC-003 asks for
 * immediate — which is only true if the sessions they already hold stop working.
 */
export async function changeMemberRole(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const returnTo = `/${locale}/organization/team`;
  const viewer = await requireViewer(locale, returnTo);
  const membership = activeOrganization(viewer);
  if (!membership) redirect(`/${locale}/account`);

  authorize(viewer, 'update', {
    class: 'membership',
    organizationId: membership.organizationId,
  });

  const userId = text(formData, 'userId');
  const rawRole = text(formData, 'role');
  const remove = rawRole === 'remove';
  if (!remove && !isRole(rawRole)) redirect(`${returnTo}?error=details`);
  if (!remove && isRole(rawRole) && !canInviteRole(membership.role, rawRole)) {
    // The same containment as invitations: an administrator cannot promote
    // someone into a role they could not have invited them into.
    redirect(`${returnTo}?error=role`);
  }

  // The member must already be in this tenant. Row-level security would refuse
  // the write anyway; checking first turns a silent no-op into a clear refusal.
  const team = await listTeam(membership.organizationId);
  if (!team.some((m) => m.userId === userId)) redirect(`${returnTo}?error=details`);

  try {
    await changeMembership({
      organizationId: membership.organizationId,
      userId,
      newRole: remove ? null : (rawRole as Role),
      actorUserId: viewer.user.id,
      correlationId: newCorrelationId(),
    });
  } catch (error) {
    if (error instanceof LastAdministratorError) redirect(`${returnTo}?error=last_admin`);
    throw error;
  }

  if (remove) {
    await revokeAllUserSessions(userId, 'membership_revoked');
  }
  redirect(`${returnTo}?${remove ? 'removed' : 'updated'}=1`);
}

/* -------------------------------------------------------------------------- */
/* Accepting an invitation                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Accepts an invitation, creating the account if the person does not have one.
 *
 * The address is not editable: it comes from the invitation, and
 * `acceptInvitation` re-checks that the accepting account's address matches. A
 * forwarded invitation email must not become a membership for whoever received
 * it.
 */
export async function acceptTeamInvitation(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get('locale'));
  const token = text(formData, 'token');
  const displayName = text(formData, 'displayName');
  const password = String(formData.get('password') ?? '');
  const email = text(formData, 'email').toLowerCase();
  const correlationId = newCorrelationId();

  await enforceRateLimit('sign_up', locale);
  const back = `/${locale}/join?token=${encodeURIComponent(token)}`;

  let user = await findUserByEmail(email);
  if (!user) {
    if (displayName.length < 1) redirect(`${back}&error=details`);
    const problems = passwordProblems(password, [email, displayName]);
    if (problems.length > 0) redirect(`${back}&error=password_${problems[0]}`);

    const subject = await integrations().identity.createSubject(
      { email, displayName, locale },
      { idempotencyKey: `invite-signup:${email}` },
    );
    await integrations().identity.setPassword({ subjectId: subject.externalId, password });
    user = await createUser({
      email,
      displayName,
      preferredLanguage: locale,
      identitySubjectId: subject.externalId,
    });
  } else if (!user.identitySubjectId) {
    // A user row seeded by assisted onboarding, with no provider account yet.
    const subject = await integrations().identity.createSubject(
      { email, displayName: user.displayName, locale },
      { idempotencyKey: `invite-link:${user.id}` },
    );
    await integrations().identity.setPassword({ subjectId: subject.externalId, password });
    await linkIdentitySubject(user.id, subject.externalId);
  }

  const result = await acceptInvitation({
    token,
    userId: user.id,
    userEmail: user.email,
    correlationId,
  });

  if (result.outcome !== 'accepted') {
    redirect(`${back}&error=${result.outcome === 'wrong_address' ? 'address' : 'invalid'}`);
  }

  // Sign-in follows, which routes through enrolment for a new account. Joining a
  // team does not skip the second factor.
  redirect(`/${locale}/sign-in?joined=1`);
}
