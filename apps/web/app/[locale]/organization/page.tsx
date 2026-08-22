import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { findOrganization } from '@northstar/db';
import { EMPLOYEE_BANDS, ORGANIZATION_TYPES } from '@northstar/domain';
import { StatusMessage } from '@northstar/ui';
import { updateOrganization } from '@/app/actions/account';
import { activeOrganization, permits, requireViewer } from '@/lib/auth';
import { isLocale, t } from '@/lib/i18n';

/**
 * The organization profile — CLP-001.
 *
 * Read by anyone in the tenant; editable only where the policy layer says so.
 * The read-only rendering is not a security control — `updateOrganization`
 * re-asks the policy layer on every submission — but showing an editable form to
 * someone whose save will be refused is a small cruelty, so the page asks too.
 */
export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;

  const viewer = await requireViewer(locale, `/${locale}/organization`);
  const membership = activeOrganization(viewer);
  if (!membership) redirect(`/${locale}/account`);

  const organization = await findOrganization(membership.organizationId);
  if (!organization) redirect(`/${locale}/account`);

  const mayEdit = permits(viewer, 'update', {
    class: 'organization',
    organizationId: membership.organizationId,
    id: membership.organizationId,
  });
  const mayManageTeam = permits(viewer, 'read', {
    class: 'invitation',
    organizationId: membership.organizationId,
  });

  return (
    <div className="ns-page ns-page--form">
      <h1>{t(locale, 'org.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'org.lede')}</p>

      {query.saved ? <StatusMessage>{t(locale, 'org.saved')}</StatusMessage> : null}
      {query.error ? (
        <p className="ns-form-error" role="alert">
          <span className="ns-visually-hidden">{t(locale, 'qualifier.error.prefix')} </span>
          {t(locale, 'org.error.details')}
        </p>
      ) : null}

      {mayEdit ? (
        <form action={updateOrganization} className="ns-form">
          <input type="hidden" name="locale" value={locale} />

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="legalName">
              {t(locale, 'signUp.orgName')}
            </label>
            <input
              className="ns-field__input"
              id="legalName"
              name="legalName"
              type="text"
              defaultValue={organization.legalName}
              required
            />
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="organizationType">
              {t(locale, 'signUp.orgType')}
            </label>
            <select
              className="ns-field__select"
              id="organizationType"
              name="organizationType"
              defaultValue={organization.organizationType}
              required
            >
              {ORGANIZATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(locale, `orgType.${type}` as 'orgType.other')}
                </option>
              ))}
            </select>
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="employeeBand">
              {t(locale, 'signUp.band')}
            </label>
            <p className="ns-field__hint" id="org-band-hint">
              {t(locale, 'signUp.bandHint')}
            </p>
            <select
              className="ns-field__select"
              id="employeeBand"
              name="employeeBand"
              defaultValue={organization.employeeBand}
              aria-describedby="org-band-hint"
              required
            >
              {EMPLOYEE_BANDS.map((band) => (
                <option key={band} value={band}>
                  {t(locale, `band.${band}` as 'band.under_20')}
                </option>
              ))}
            </select>
          </div>

          <div className="ns-field">
            <label className="ns-field__label" htmlFor="jurisdiction">
              {t(locale, 'signUp.jurisdiction')}
            </label>
            <select
              className="ns-field__select"
              id="jurisdiction"
              name="jurisdiction"
              defaultValue={organization.jurisdiction}
              required
            >
              <option value="CA-ON">Ontario</option>
            </select>
          </div>

          <div className="ns-step-actions">
            <button className="ns-button ns-button--primary" type="submit">
              {t(locale, 'org.save')}
            </button>
          </div>
        </form>
      ) : (
        <dl className="ns-trace">
          <div className="ns-trace__row">
            <dt>{t(locale, 'signUp.orgName')}</dt>
            <dd>{organization.legalName}</dd>
          </div>
          <div className="ns-trace__row">
            <dt>{t(locale, 'signUp.orgType')}</dt>
            <dd>{t(locale, `orgType.${organization.organizationType}` as 'orgType.other')}</dd>
          </div>
          <div className="ns-trace__row">
            <dt>{t(locale, 'signUp.band')}</dt>
            <dd>{t(locale, `band.${organization.employeeBand}` as 'band.under_20')}</dd>
          </div>
        </dl>
      )}

      {mayManageTeam ? (
        <div className="ns-alt-path">
          <p>
            <Link href={`/${locale}/organization/team`}>{t(locale, 'org.teamLink')}</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
