import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, t } from '@/lib/i18n';

/**
 * The neutral outcome for an address that already has an account.
 *
 * Sign-up cannot say "that address is already registered" without becoming an
 * account-enumeration oracle (threat model T-13), so it says the same thing to
 * everyone: check the inbox. The wording is deliberately conditional — "if that
 * address can be used" — because claiming a message was sent when none was would
 * be a small lie told to every attacker and every honest person alike.
 */
export default async function CheckYourEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'signUp.check.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'signUp.check.body')}</p>
      <div className="ns-alt-path">
        <p>
          <Link href={`/${locale}/sign-in`}>{t(locale, 'nav.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
