import Link from 'next/link';
import type { EmployeeBand } from '@northstar/domain';
import { OFFERS, priceLabel } from '@/lib/offers';
import { t, type Locale, type StringKey } from '@/lib/i18n';

/**
 * Homepage modules — PRD §7.
 *
 * Art direction note: §14 asks for commissioned documentary photography and
 * explicitly warns against "tokenistic stock photography" and "AI-perfect
 * hands/screens". No commissioned photography exists yet, so these sections are
 * type-led: hierarchy, space and rules carry the design. That is a deliberate
 * holding position, not a style — real imagery replaces it, and faking it with
 * stock would have contradicted the brief it was meant to satisfy.
 */

/* ------------------------------------------------------------------ */

const HERO_FACTS = ['reviewed', 'delivered', 'tested'] as const;

export function Hero({ locale, band }: { locale: Locale; band?: EmployeeBand | undefined }) {
  return (
    <section className="ns-section ns-hero">
      <div className="ns-container">
        <div className="ns-hero__grid">
          <div>
            <p className="ns-eyebrow">{t(locale, 'hero.eyebrow')}</p>

            {/*
              The emphasised clause is a separate string rather than markup
              embedded in a translation. Translators should never have to
              preserve HTML to keep a design working, and a French sentence
              often needs the emphasis in a different position.
            */}
            <h1 className="ns-hero__title">
              {t(locale, 'hero.title.lead')} <em>{t(locale, 'hero.title.emphasis')}</em>
              {t(locale, 'hero.title.tail')}
            </h1>

            <p className="ns-hero__lede">{t(locale, 'hero.lede')}</p>

            <div className="ns-cta-row">
              {/* One primary action, one secondary — PRD §7 hero requirement. */}
              <Link className="ns-button ns-button--primary" href={`/${locale}/check`}>
                {t(locale, 'hero.primaryCta')}
              </Link>
              <Link className="ns-button ns-button--secondary" href={`/${locale}/how-it-works`}>
                {t(locale, 'hero.secondaryCta')}
              </Link>
            </div>

            <p className="ns-hero__reassurance">{t(locale, 'hero.reassurance')}</p>

            {band ? (
              <p className="ns-hero__personalized" role="status">
                {t(locale, `hero.band.${band}` as StringKey)}
              </p>
            ) : null}
          </div>

          {/*
            Facts, not claims. Each of these is a policy written down in the PRD
            and enforced somewhere in this codebase, which is why they can sit
            this prominently without a citation.
          */}
          <aside className="ns-hero__aside" aria-label={t(locale, 'hero.factsLabel')}>
            <dl className="ns-facts">
              {HERO_FACTS.map((fact) => (
                <div key={fact}>
                  <dt>{t(locale, `hero.fact.${fact}.label` as StringKey)}</dt>
                  <dd>{t(locale, `hero.fact.${fact}.value` as StringKey)}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const OFFER_COPY: Record<string, { name: StringKey; outcome: StringKey; includes: StringKey; timing: StringKey; inputs: StringKey; excludes: StringKey }> = {
  readiness_assessment: {
    name: 'offer.readiness_assessment.name',
    outcome: 'offer.readiness_assessment.outcome',
    includes: 'offer.readiness_assessment.includes',
    timing: 'offer.readiness_assessment.timing',
    inputs: 'offer.readiness_assessment.inputs',
    excludes: 'offer.readiness_assessment.excludes',
  },
  core_readiness: {
    name: 'offer.core_readiness.name',
    outcome: 'offer.core_readiness.outcome',
    includes: 'offer.core_readiness.includes',
    timing: 'offer.core_readiness.timing',
    inputs: 'offer.core_readiness.inputs',
    excludes: 'offer.core_readiness.excludes',
  },
  digital_readiness: {
    name: 'offer.digital_readiness.name',
    outcome: 'offer.digital_readiness.outcome',
    includes: 'offer.digital_readiness.includes',
    timing: 'offer.digital_readiness.timing',
    inputs: 'offer.digital_readiness.inputs',
    excludes: 'offer.digital_readiness.excludes',
  },
  remediation_management: {
    name: 'offer.remediation_management.name',
    outcome: 'offer.remediation_management.outcome',
    includes: 'offer.remediation_management.includes',
    timing: 'offer.remediation_management.timing',
    inputs: 'offer.remediation_management.inputs',
    excludes: 'offer.remediation_management.excludes',
  },
  care_plan: {
    name: 'offer.care_plan.name',
    outcome: 'offer.care_plan.outcome',
    includes: 'offer.care_plan.includes',
    timing: 'offer.care_plan.timing',
    inputs: 'offer.care_plan.inputs',
    excludes: 'offer.care_plan.excludes',
  },
};

/**
 * Offer architecture — PRD §7: "Show outcome, inclusions, indicative price,
 * timing, required client inputs and exclusions."
 *
 * The exclusions row is the commercially useful one: it reduces mismatched
 * leads, which §7 names as the module's conversion purpose. It is given the same
 * visual weight as the inclusions rather than being tucked into small print.
 */
export function OfferArchitecture({ locale }: { locale: Locale }) {
  return (
    <section className="ns-section" id="services">
      <div className="ns-container">
        <p className="ns-eyebrow">{t(locale, 'offers.eyebrow')}</p>
        <h2 className="ns-section__title">{t(locale, 'offers.heading')}</h2>
        <p className="ns-section__lede">{t(locale, 'offers.lede')}</p>

        <div className="ns-offers">
          {OFFERS.map((offer) => {
            const copy = OFFER_COPY[offer.key]!;
            const price = priceLabel(offer, locale);
            return (
              <article className="ns-offer" key={offer.key}>
                <h3 className="ns-offer__name">{t(locale, copy.name)}</h3>
                <p className="ns-offer__price">
                  {price ? (
                    <>
                      <span className="ns-offer__amount">{price}</span>{' '}
                      <span className="ns-offer__qualifier">{t(locale, 'offers.indicative')}</span>
                    </>
                  ) : (
                    <span className="ns-offer__amount">{t(locale, 'offers.custom')}</span>
                  )}
                </p>
                <p className="ns-offer__outcome">{t(locale, copy.outcome)}</p>

                <dl className="ns-offer__detail">
                  <dt>{t(locale, 'offers.includes')}</dt>
                  <dd>{t(locale, copy.includes)}</dd>
                  <dt>{t(locale, 'offers.timing')}</dt>
                  <dd>{t(locale, copy.timing)}</dd>
                  <dt>{t(locale, 'offers.inputs')}</dt>
                  <dd>{t(locale, copy.inputs)}</dd>
                  <dt>{t(locale, 'offers.excludes')}</dt>
                  <dd>{t(locale, copy.excludes)}</dd>
                </dl>
              </article>
            );
          })}
        </div>

        <p className="ns-note">{t(locale, 'offers.priceNote')}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const STAGES = ['understand', 'evidence', 'remediate', 'maintain'] as const;

/**
 * Method — PRD §7: "Visual four-stage path… All motion optional."
 *
 * Rendered as an ordered list, so the sequence is conveyed by the markup rather
 * than by position or animation. There is no motion here at all, which is the
 * simplest way to satisfy "all motion optional".
 */
export function Method({ locale }: { locale: Locale }) {
  return (
    <section className="ns-section ns-section--inverse" id="method">
      <div className="ns-container">
        <p className="ns-eyebrow">{t(locale, 'method.eyebrow')}</p>
        <h2 className="ns-section__title">{t(locale, 'method.heading')}</h2>
        <p className="ns-section__lede">{t(locale, 'method.lede')}</p>

        <ol className="ns-method">
          {STAGES.map((stage, index) => (
            <li className="ns-method__stage" key={stage}>
              <span className="ns-method__number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="ns-method__name">{t(locale, `method.${stage}.name` as StringKey)}</h3>
              <p className="ns-method__body">{t(locale, `method.${stage}.body` as StringKey)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const TRUST_POINTS = ['review', 'credentials', 'security', 'livedExperience', 'boundaries'] as const;

/**
 * Trust layer — PRD §7.
 *
 * §7 asks for named leadership, a credential policy, insurance posture, secure
 * handling, paid lived-experience testing and sample report excerpts. Several of
 * those are claims about people and arrangements that do not exist yet, and
 * inventing them on a site whose entire proposition is trustworthiness would be
 * the worst possible thing to fake. So this section states the *policies* the
 * PRD commits to — which are real, they are written down — and the modules that
 * need real people or real engagements carry an explicit not-yet state below.
 */
export function TrustLayer({ locale }: { locale: Locale }) {
  return (
    <section className="ns-section ns-section--muted" id="trust">
      <div className="ns-container">
        <p className="ns-eyebrow">{t(locale, 'trust.eyebrow')}</p>
        <h2 className="ns-section__title">{t(locale, 'trust.heading')}</h2>
        <p className="ns-section__lede">{t(locale, 'trust.lede')}</p>

        <div className="ns-grid">
          {TRUST_POINTS.map((point) => (
            <div className="ns-trust" key={point}>
              <h3 className="ns-trust__name">{t(locale, `trust.${point}.name` as StringKey)}</h3>
              <p className="ns-trust__body">{t(locale, `trust.${point}.body` as StringKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Case narratives and sample outputs — PRD §7.
 *
 * Deliberately empty. §7 wants "before/after operational stories with
 * constraints, actions and measured outcomes" and warns against "anonymous
 * vanity quotes without context". There are no engagements yet, so there is
 * nothing true to put here.
 *
 * Showing an honest empty state costs a little conversion and keeps the one
 * asset the business actually has. It also matches how the rest of the product
 * behaves: when something is unreviewed or absent, it says so (CNT-005).
 */
export function ProofPending({ locale }: { locale: Locale }) {
  return (
    <section className="ns-section" id="proof">
      <div className="ns-container">
        <p className="ns-eyebrow">{t(locale, 'proof.eyebrow')}</p>
        <h2 className="ns-section__title">{t(locale, 'proof.heading')}</h2>
        <div className="ns-prose ns-empty-state">
          <p>{t(locale, 'proof.body')}</p>
          <p>{t(locale, 'proof.invitation')}</p>
          <p>
            <Link href={`/${locale}/contact`}>{t(locale, 'proof.cta')}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function FinalCta({ locale }: { locale: Locale }) {
  return (
    <section className="ns-section ns-section--raised" id="start">
      <div className="ns-container ns-container--narrow">
        <h2 className="ns-section__title">{t(locale, 'finalCta.heading')}</h2>
        <p className="ns-section__lede">{t(locale, 'finalCta.lede')}</p>
        <div className="ns-cta-row">
          <Link className="ns-button ns-button--primary" href={`/${locale}/check`}>
            {t(locale, 'finalCta.primary')}
          </Link>
          {/* PUB-005: a person is always an equal-weight alternative. */}
          <Link className="ns-button ns-button--secondary" href={`/${locale}/contact`}>
            {t(locale, 'finalCta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
