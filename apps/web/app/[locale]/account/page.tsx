import Link from 'next/link';
import { notFound } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { isLocale, t } from '@/lib/i18n';
import { requireViewer } from '@/lib/auth';

/**
 * The account landing page.
 *
 * It shows what the person is, not what they may do: the organizations they
 * belong to and the role they hold in each. Every control that acts on any of it
 * lives behind a policy check on its own action (ENG-001) — this page links, it
 * does not authorize.
 */
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const viewer = await requireViewer(locale, `/${locale}/account`);

  return (
    <div className="ns-page ns-page--form">
      <h1>{t(locale, 'account.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'account.lede')}</p>

      <section className="ns-panel" aria-labelledby="orgs-heading">
        <h2 className="ns-panel__heading" id="orgs-heading">
          {t(locale, 'account.organizations')}
        </h2>
        <ul className="ns-plain-list">
          {viewer.memberships.map((membership) => (
            <li className="ns-record" key={membership.organizationId}>
              <span className="ns-record__primary">{membership.organizationName}</span>
              <span className="ns-record__secondary">
                {t(locale, `role.${membership.role}` as 'role.client_admin')}
              </span>
            </li>
          ))}
        </ul>
        <p>
          <Link href={`/${locale}/organization`}>{t(locale, 'org.title')}</Link>
        </p>
      </section>

      <section className="ns-panel" aria-labelledby="security-heading">
        <h2 className="ns-panel__heading" id="security-heading">
          {t(locale, 'account.security.title')}
        </h2>
        <p>{t(locale, 'account.security.lede')}</p>
        <p>
          <Link href={`/${locale}/account/security`}>{t(locale, 'account.security.link')}</Link>
        </p>
      </section>

      <form action={signOut} className="ns-step-actions">
        <input type="hidden" name="locale" value={locale} />
        <button className="ns-button ns-button--secondary" type="submit">
          {t(locale, 'auth.signOut')}
        </button>
      </form>
    </div>
  );
}
