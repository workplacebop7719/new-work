import { notFound } from 'next/navigation';
import { findInvitationByToken, findOrganizationName, findUserByEmail } from '@northstar/db';
import { acceptTeamInvitation } from '@/app/actions/account';
import { isLocale, t, type Locale } from '@/lib/i18n';

/**
 * Accepting an invitation — CLP-013.
 *
 * The invitation is resolved for display only. Nothing on this page grants
 * anything: `acceptInvitation` re-reads the row `FOR UPDATE` inside the
 * transaction that creates the membership, so an invitation revoked between
 * this page rendering and the form being submitted is refused at the write.
 *
 * The address is shown and not editable. `acceptInvitation` checks it again
 * server-side — a forwarded invitation email must not become a membership for
 * whoever received it.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { token, error } = await searchParams;

  const invitation = token ? await findInvitationByToken(token) : undefined;

  if (!invitation) return <Unusable locale={locale} reason="unknown" />;
  if (invitation.state !== 'pending') return <Unusable locale={locale} reason={invitation.state} />;

  const organizationName = await findOrganizationName(invitation.organizationId);
  const existing = await findUserByEmail(invitation.email);
  const roleLabel = t(locale, `role.${invitation.role}` as 'role.client_admin');

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'join.title').replace('{organization}', organizationName ?? '')}</h1>
      <p className="ns-page__lede">
        {t(locale, 'join.lede').replace('{role}', roleLabel)}
      </p>
      {existing ? <p>{t(locale, 'join.existing')}</p> : null}

      {error ? (
        <p className="ns-form-error" role="alert">
          <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
          {joinError(locale, error)}
        </p>
      ) : null}

      <form action={acceptTeamInvitation} className="ns-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />
        {/*
          The address travels as a hidden field for the form's convenience and is
          checked again against the invitation row on the server. A tampered
          value produces `wrong_address`, not a membership.
        */}
        <input type="hidden" name="email" value={invitation.email} />

        <div className="ns-field">
          <p className="ns-field__label">{t(locale, 'join.emailLabel')}</p>
          <p className="ns-field__static">{invitation.email}</p>
          <p className="ns-field__hint">{t(locale, 'join.emailFixed')}</p>
        </div>

        {existing ? null : (
          <div className="ns-field">
            <label className="ns-field__label" htmlFor="join-name">
              {t(locale, 'join.nameLabel')}
            </label>
            <input
              className="ns-field__input"
              id="join-name"
              name="displayName"
              type="text"
              autoComplete="name"
              required
            />
          </div>
        )}

        <div className="ns-field">
          <label className="ns-field__label" htmlFor="join-password">
            {t(locale, 'join.passwordLabel')}
          </label>
          <p className="ns-field__hint" id="join-password-hint">
            {t(locale, 'signUp.passwordHint')}
          </p>
          <input
            className="ns-field__input"
            id="join-password"
            name="password"
            type="password"
            autoComplete={existing ? 'current-password' : 'new-password'}
            aria-describedby="join-password-hint"
            minLength={12}
            required
          />
        </div>

        <div className="ns-step-actions">
          <button className="ns-button ns-button--primary" type="submit">
            {t(locale, 'join.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Says why the link no longer works.
 *
 * Expired, revoked and already-used are told apart on purpose. "This link is
 * invalid" would leave a colleague guessing whether to ask for a new invitation
 * or to check whether they already have an account — and neither state reveals
 * anything an invited person does not already know.
 */
function Unusable({
  locale,
  reason,
}: {
  locale: Locale;
  reason: 'unknown' | 'expired' | 'revoked' | 'accepted' | 'pending';
}) {
  const key =
    reason === 'expired'
      ? 'join.invalid.expired'
      : reason === 'revoked'
        ? 'join.invalid.revoked'
        : reason === 'accepted'
          ? 'join.invalid.accepted'
          : 'join.invalid.unknown';

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'join.invalid.title')}</h1>
      <p className="ns-page__lede">{t(locale, key)}</p>
    </div>
  );
}

function joinError(locale: Locale, error: string): string {
  if (error === 'address') return t(locale, 'join.error.address');
  if (error.startsWith('password_')) {
    return t(locale, `signUp.error.${error}` as 'signUp.error.password_too_short');
  }
  if (error === 'details') return t(locale, 'join.error.details');
  return t(locale, 'join.error.invalid');
}
