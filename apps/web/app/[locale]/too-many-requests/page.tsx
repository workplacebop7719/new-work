import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, t } from '@/lib/i18n';

/**
 * The rate-limit refusal — question Q-27, ACC-005, ACC-006.
 *
 * Deliberately an ordinary page: a heading, plain language, how long to wait,
 * and a way to reach a person immediately. No challenge, no puzzle, no timer
 * that counts down and steals focus. A visitor refused here can still get help
 * the moment they want it, which is the point — the limit protects the endpoint,
 * it must not cut anyone off from the service.
 */
export default async function TooManyRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ retryAfter?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { retryAfter } = await searchParams;
  const seconds = Number(retryAfter);
  const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : undefined;

  return (
    <div className="ns-page">
      <h1>{t(locale, 'rateLimit.heading')}</h1>
      <p className="ns-lede">{t(locale, 'rateLimit.body')}</p>

      {minutes ? <p>{t(locale, 'rateLimit.retry').replace('{minutes}', String(minutes))}</p> : null}

      <p>{t(locale, 'rateLimit.noPuzzle')}</p>

      <p className="ns-alt-path">
        <Link className="ns-button ns-button--primary" href={`/${locale}/contact`}>
          {t(locale, 'rateLimit.contact')}
        </Link>
      </p>
    </div>
  );
}
