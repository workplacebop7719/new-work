import { notFound, redirect } from 'next/navigation';
import { listInvitations, listTeam } from '@northstar/db';
import { INVITATION_TTL_MS, invitableRoles } from '@northstar/domain';
import { StatusMessage } from '@northstar/ui';
import { changeMemberRole, inviteMember, revokeMemberInvitation } from '@/app/actions/account';
import { activeOrganization, permits, requireViewer } from '@/lib/auth';
import { isLocale, t, type Locale } from '@/lib/i18n';

/**
 * People and access — CLP-013.
 *
 * The demonstration this page exists for: invite two roles with different
 * permissions, revoke one, and show the effect immediately. "Immediately" is
 * load-bearing — removing a membership also ends the sessions that person
 * already holds, so the change is not deferred to their next sign-in.
 *
 * The roles offered in the invite form come from `invitableRoles`, so an
 * administrator is never shown a role they cannot grant. The server checks it
 * again on submission, because a select element is presentation.
 */
export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    invited?: string;
    link?: string;
    revoked?: string;
    updated?: string;
    removed?: string;
    error?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;

  const viewer = await requireViewer(locale, `/${locale}/organization/team`);
  const membership = activeOrganization(viewer);
  if (!membership) redirect(`/${locale}/account`);

  const mayInvite = permits(viewer, 'create', {
    class: 'invitation',
    organizationId: membership.organizationId,
  });
  const mayManageMembers = permits(viewer, 'update', {
    class: 'membership',
    organizationId: membership.organizationId,
  });
  if (!mayInvite && !permits(viewer, 'read', {
    class: 'invitation',
    organizationId: membership.organizationId,
  })) {
    // Not an authorization decision — that already happened. This is the page
    // declining to render a surface the viewer has no business on.
    redirect(`/${locale}/organization`);
  }

  const team = await listTeam(membership.organizationId);
  const invitations = await listInvitations(membership.organizationId);
  const pending = invitations.filter((invitation) => invitation.state === 'pending');
  const grantable = invitableRoles(membership.role);

  return (
    <div className="ns-page ns-page--form">
      <h1>{t(locale, 'team.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'team.lede')}</p>

      {notice(locale, query) ? <StatusMessage>{notice(locale, query)}</StatusMessage> : null}
      {query.link ? <LocalInvitationLink locale={locale} href={query.link} /> : null}
      {query.error ? (
        <p className="ns-form-error" role="alert">
          <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
          {teamError(locale, query.error)}
        </p>
      ) : null}

      {mayInvite && grantable.length > 0 ? (
        <section className="ns-panel" aria-labelledby="invite-heading">
          <h2 className="ns-panel__heading" id="invite-heading">
            {t(locale, 'team.invite.heading')}
          </h2>
          <form action={inviteMember} className="ns-form">
            <input type="hidden" name="locale" value={locale} />

            <div className="ns-field">
              <label className="ns-field__label" htmlFor="invite-email">
                {t(locale, 'team.invite.email')}
              </label>
              <input
                className="ns-field__input"
                id="invite-email"
                name="email"
                type="email"
                autoComplete="off"
                required
              />
            </div>

            <fieldset className="ns-radio-group">
              <legend className="ns-radio-group__legend">
                <span className="ns-field__label">{t(locale, 'team.invite.role')}</span>
              </legend>
              {grantable.map((role) => (
                <div className="ns-radio" key={role}>
                  <input type="radio" id={`role-${role}`} name="role" value={role} required />
                  <label htmlFor={`role-${role}`}>
                    {t(locale, `role.${role}` as 'role.client_admin')}
                  </label>
                  {/*
                    The description sits with the option rather than in a
                    tooltip: choosing a role is a permissions decision, and the
                    consequence should be readable without a hover.
                  */}
                  <p className="ns-radio__description">
                    {t(locale, `role.${role}.description` as 'role.client_admin.description')}
                  </p>
                </div>
              ))}
            </fieldset>

            <div className="ns-step-actions">
              <button className="ns-button ns-button--primary" type="submit">
                {t(locale, 'team.invite.submit')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="ns-panel" aria-labelledby="members-heading">
        <h2 className="ns-panel__heading" id="members-heading">
          {t(locale, 'team.members.heading')}
        </h2>
        <ul className="ns-plain-list">
          {team.map((member) => (
            <li className="ns-record ns-record--wide" key={member.userId}>
              <div>
                <span className="ns-record__primary">{member.displayName}</span>
                <span className="ns-record__secondary">
                  {member.email} · {t(locale, `role.${member.role}` as 'role.client_admin')} ·{' '}
                  {t(locale, 'team.members.joined')} {formatDate(member.joinedAt, locale)}
                </span>
              </div>

              {mayManageMembers && member.userId !== viewer.user.id ? (
                <form action={changeMemberRole} className="ns-record__actions">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <label className="ns-visually-hidden" htmlFor={`role-select-${member.userId}`}>
                    {t(locale, 'team.members.role')}
                  </label>
                  <select
                    className="ns-field__select ns-field__select--inline"
                    id={`role-select-${member.userId}`}
                    name="role"
                    defaultValue={member.role}
                  >
                    {grantable.map((role) => (
                      <option key={role} value={role}>
                        {t(locale, `role.${role}` as 'role.client_admin')}
                      </option>
                    ))}
                    <option value="remove">{t(locale, 'team.members.remove')}</option>
                  </select>
                  <button className="ns-button ns-button--secondary ns-button--compact" type="submit">
                    {t(locale, 'team.members.change')}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="ns-panel" aria-labelledby="pending-heading">
        <h2 className="ns-panel__heading" id="pending-heading">
          {t(locale, 'team.pending.heading')}
        </h2>
        {pending.length === 0 ? (
          <p>{t(locale, 'team.pending.none')}</p>
        ) : (
          <ul className="ns-plain-list">
            {pending.map((invitation) => (
              <li className="ns-record ns-record--wide" key={invitation.id}>
                <div>
                  <span className="ns-record__primary">{invitation.email}</span>
                  <span className="ns-record__secondary">
                    {t(locale, `role.${invitation.role}` as 'role.client_admin')} ·{' '}
                    {t(locale, 'team.pending.sent')} {formatDate(invitation.createdAt, locale)} ·{' '}
                    {t(locale, 'team.pending.expires')}{' '}
                    {formatDate(new Date(invitation.createdAt.getTime() + INVITATION_TTL_MS), locale)}
                  </span>
                </div>
                {mayInvite ? (
                  <form action={revokeMemberInvitation} className="ns-record__actions">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <button className="ns-button ns-button--secondary ns-button--compact" type="submit">
                      {t(locale, 'team.pending.revoke')}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * The invitation link, on local builds only.
 *
 * `inviteMember` supplies it solely when the fake email adapter is in use, so
 * this cannot render against a real mail provider — there would be a real
 * message instead, and putting a bearer token on screen would be a leak rather
 * than a convenience.
 */
function LocalInvitationLink({ locale, href }: { locale: Locale; href: string }) {
  return (
    <aside className="ns-demo" aria-labelledby="local-link-heading">
      <h2 className="ns-demo__heading" id="local-link-heading">
        {t(locale, 'team.localLink.heading')}
      </h2>
      <p className="ns-demo__body">{t(locale, 'team.localLink.body')}</p>
      <p>
        <a href={href}>{href}</a>
      </p>
    </aside>
  );
}

function notice(
  locale: Locale,
  query: { invited?: string; revoked?: string; updated?: string; removed?: string },
): string | undefined {
  if (query.invited) return t(locale, 'team.invited');
  if (query.revoked) return t(locale, 'team.revoked');
  if (query.updated) return t(locale, 'team.updated');
  if (query.removed) return t(locale, 'team.removed');
  return undefined;
}

function teamError(locale: Locale, error: string): string {
  if (error === 'last_admin') return t(locale, 'team.error.last_admin');
  if (error === 'role') return t(locale, 'team.error.role');
  return t(locale, 'team.error.details');
}

function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
