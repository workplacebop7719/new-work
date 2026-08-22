import { notFound } from 'next/navigation';
import { currentEnrolmentOffer, MfaEnrolment } from '@/app/components/mfa-enrolment';
import { isLocale, t } from '@/lib/i18n';
import { demoTotpFor } from '@/lib/demo';

/**
 * Enrolment during sign-in.
 *
 * Reached when the password was accepted and the account has no second factor —
 * the invited-user path, and the path a person lands on immediately after
 * creating an organization. It is not skippable: there is no "later" link,
 * because SEC-002 asks for MFA on every account and an account that can defer it
 * indefinitely does not have it.
 *
 * Completing enrolment here does not create a session. The person signs in again
 * with the factor they have just set up, which keeps `verifySecondFactor` the
 * only place in the codebase that issues one.
 */
export default async function SignInEnrolPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ enrolment?: string; returnTo?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;

  const offer = await currentEnrolmentOffer(query.enrolment);

  return (
    <div className="ns-page ns-page--form ns-page--narrow">
      <h1>{t(locale, 'auth.enrol.title')}</h1>
      <p className="ns-page__lede">{t(locale, 'auth.enrol.lede')}</p>

      <MfaEnrolment
        locale={locale}
        offer={offer}
        during
        returnTo={query.returnTo}
        error={query.error}
        currentCode={await demoTotpFor(offer?.manualEntrySecret)}
      />
    </div>
  );
}
