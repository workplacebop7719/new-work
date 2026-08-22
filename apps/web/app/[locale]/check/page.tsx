import { notFound } from 'next/navigation';
import Link from 'next/link';
import { startQualifier } from '@/app/actions/qualifier';
import { isLocale, t } from '@/lib/i18n';
import { TOTAL_STEPS } from '@/lib/questions';

export default async function QualifierStart({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="ns-page">
      <h1>{t(locale, 'qualifier.start.heading')}</h1>
      <p className="ns-lede">{t(locale, 'qualifier.start.body')}</p>

      <ul className="ns-plain-list">
        <li>{t(locale, 'qualifier.start.point.questions').replace('{count}', String(TOTAL_STEPS))}</li>
        <li>{t(locale, 'qualifier.start.point.noAccount')}</li>
        <li>{t(locale, 'qualifier.start.point.notLegal')}</li>
      </ul>

      <form action={startQualifier}>
        <input type="hidden" name="locale" value={locale} />
        <button className="ns-button ns-button--primary" type="submit">
          {t(locale, 'qualifier.start.cta')}
        </button>
      </form>

      {/* PUB-005: a person is reachable without completing anything. */}
      <p className="ns-alt-path">
        <Link href={`/${locale}/contact`}>{t(locale, 'qualifier.start.humanPath')}</Link>
      </p>
    </div>
  );
}
