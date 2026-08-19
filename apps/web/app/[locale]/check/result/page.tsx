import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { evaluate } from '@northstar/domain';
import { StatusBadge } from '@northstar/ui';
import { recordSourceOpened } from '@/app/actions/qualifier';
import { getClaim } from '@/lib/claims';
import { isLocale, t, type Locale, type StringKey } from '@/lib/i18n';
import { QUESTIONS } from '@/lib/questions';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * The result page — CNV-002, CNV-003.
 *
 * Three things it must do, and one it must not:
 *
 *  - show the inputs and the rule category that produced the recommendation;
 *  - show an uncertainty notice on every result, not only the uncertain one;
 *  - offer the official free route as a first-class link, not buried;
 *  - never state or imply a compliance conclusion (PRD §8, question Q-21).
 *
 * The result is recomputed from the stored answers rather than read from a
 * cached string, so what the visitor sees always matches what the rules say.
 */
export default async function ResultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const session = await getSession();
  if (!session) redirect(`/${locale}/check`);

  const result = evaluate(session.answers);
  const claim = getClaim('on.reporting.deadline');

  // Explicit maps rather than template-literal key building: a typo in a
  // constructed key would fall back to English at runtime instead of failing
  // typecheck, which is exactly the silent-fallback behaviour PUB-001 forbids.
  const CATEGORY_LABEL: Record<typeof result.category, StringKey> = {
    likely_self_serve: 'result.category.likely_self_serve',
    assessment_fit: 'result.category.assessment_fit',
    specialist_fit: 'result.category.specialist_fit',
    uncertain: 'result.category.uncertain',
  };
  const CATEGORY_BODY: Record<typeof result.category, StringKey> = {
    likely_self_serve: 'result.body.likely_self_serve',
    assessment_fit: 'result.body.assessment_fit',
    specialist_fit: 'result.body.specialist_fit',
    uncertain: 'result.body.uncertain',
  };
  const tone = result.category === 'uncertain' ? 'warning' : 'info';

  return (
    <div className="ns-page">
      <h1>{t(locale, 'result.heading')}</h1>

      <StatusBadge tone={tone}>{t(locale, CATEGORY_LABEL[result.category])}</StatusBadge>

      <p className="ns-lede">{t(locale, CATEGORY_BODY[result.category])}</p>

      {/* CNV-002: the inputs and the rule category that produced this. */}
      <section aria-labelledby="why-heading" className="ns-claim">
        <h2 id="why-heading">{t(locale, 'result.why.heading')}</h2>
        <dl className="ns-trace">
          {result.trace.map((entry) => (
            <div className="ns-trace__row" key={`${entry.questionKey}-${entry.answer}`}>
              <dt>{questionLegend(entry.questionKey, locale)}</dt>
              <dd>
                <strong>{answerLabel(entry.questionKey, entry.answer, locale)}</strong>
                <span className="ns-trace__because"> — {entry.because}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="ns-claim__provenance">
          {t(locale, 'result.ruleVersion')}: {result.ruleVersion}
        </p>
      </section>

      {/* Required on every result, not only the uncertain category. */}
      <section aria-labelledby="uncertainty-heading" className="ns-claim ns-claim--hold">
        <h2 id="uncertainty-heading">{t(locale, 'result.uncertainty.heading')}</h2>
        <p>{result.uncertainty}</p>
      </section>

      {result.requiresHumanReview ? (
        <p className="ns-alt-path">
          <Link className="ns-button ns-button--primary" href={`/${locale}/contact`}>
            {t(locale, 'result.talkToSomeone')}
          </Link>
        </p>
      ) : null}

      {/* PRD §8: the free official route is offered plainly, and the click is
          measured because it is a real Gate 0 signal (ADR-0007). */}
      {claim ? (
        <section aria-labelledby="official-heading">
          <h2 id="official-heading">{t(locale, 'result.official.heading')}</h2>
          <p>{t(locale, 'result.official.body')}</p>
          <form action={recordSourceOpened}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="claimKey" value={claim.claimKey} />
            <button className="ns-button ns-button--secondary" type="submit">
              {claim.sourceTitle}
            </button>
          </form>
        </section>
      ) : null}

      <p className="ns-alt-path">
        <Link href={`/${locale}/check/1`}>{t(locale, 'result.changeAnswers')}</Link>
      </p>
    </div>
  );
}

function questionLegend(key: string, locale: Locale): string {
  return QUESTIONS.find((q) => q.key === key)?.legend[locale] ?? key;
}

function answerLabel(key: string, value: string, locale: Locale): string {
  const question = QUESTIONS.find((q) => q.key === key);
  const parts = value.split(', ');
  const labels = parts.map(
    (part) => question?.options.find((o) => o.value === part)?.label[locale] ?? part,
  );
  return labels.join(', ');
}
