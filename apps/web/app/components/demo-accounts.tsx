import { ensureDemoAccounts, DEMO_PASSWORD } from '@/lib/demo';
import { t, type Locale } from '@/lib/i18n';

/**
 * The demo credentials panel — CMD-003.
 *
 * It renders only when the identity provider actually in use is the in-memory
 * fake, which `ensureDemoAccounts` reports by returning an empty list otherwise.
 * The condition is the provider object, not an environment variable: a build
 * that somehow shipped with the fake would still be a build with no real
 * accounts to expose, and a build with a real provider cannot reach this branch
 * however its environment is set.
 */
export async function DemoAccounts({ locale }: { locale: Locale }) {
  const accounts = await ensureDemoAccounts();
  if (accounts.length === 0) return null;

  return (
    <aside className="ns-demo" aria-labelledby="demo-heading">
      <h2 className="ns-demo__heading" id="demo-heading">
        {t(locale, 'demo.heading')}
      </h2>
      <p className="ns-demo__body">{t(locale, 'demo.body')}</p>

      <dl className="ns-demo__list">
        {accounts.map((account) => (
          <div className="ns-demo__row" key={account.email}>
            <dt>
              <code>{account.email}</code>
            </dt>
            <dd>
              {t(locale, `role.${account.role}` as 'role.client_admin')} · {account.organizationName}
            </dd>
          </div>
        ))}
      </dl>

      <p className="ns-demo__password">
        {t(locale, 'demo.password')}: <code>{DEMO_PASSWORD}</code>
      </p>
      <p className="ns-demo__body">{t(locale, 'demo.totpHint')}</p>
    </aside>
  );
}
