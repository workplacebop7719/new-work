import { resolveClaim, type ResourceBlock } from '@northstar/domain';
import { getClaim } from '@/lib/claims';
import { t, type Locale } from '@/lib/i18n';
import { RegulatoryClaimBlock } from './regulatory-claim-block';

/**
 * Renders an article body from a closed set of block types — CNT-003, ENG-007.
 *
 * There is no free-HTML block on purpose. Editorial content that can inject
 * arbitrary markup is both an XSS surface and a way for a regulatory sentence to
 * appear without going through the claim model. The cost is that a new kind of
 * block needs a code change; that is the correct amount of friction.
 */
export function ResourceBody({ blocks, locale }: { blocks: readonly ResourceBlock[]; locale: Locale }) {
  return (
    <div className="ns-article">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 className="ns-article__heading" key={index}>
                {block.text}
              </h2>
            );
          case 'paragraph':
            return (
              <p className="ns-article__paragraph" key={index}>
                {block.text}
              </p>
            );
          case 'list':
            return (
              <ul className="ns-article__list" key={index}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case 'claim': {
            // The article supplies a key; the claim supplies the words, the
            // source and the review state. A held claim renders its hold notice
            // here, so an article cannot outlive the accuracy of what it cites.
            const claim = getClaim(block.claimKey);
            if (!claim) return null;
            return (
              <div className="ns-article__claim" key={index}>
                <RegulatoryClaimBlock resolved={resolveClaim(claim, locale, new Date())} locale={locale} />
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * CNT-004 asks for an accessibility QA record on every published resource.
 * Where none exists, the page says so rather than staying silent — an unstated
 * absence reads as a completed check.
 */
export function AccessibilityRecord({
  reviewedBy,
  reviewedAt,
  locale,
}: {
  reviewedBy: string | null;
  reviewedAt: Date | null;
  locale: Locale;
}) {
  if (!reviewedBy || !reviewedAt) {
    return (
      <p className="ns-article__qa ns-article__qa--missing">
        {t(locale, 'resources.qa.missing')}
      </p>
    );
  }
  return (
    <p className="ns-article__qa">
      {t(locale, 'resources.qa.done')
        .replace('{name}', reviewedBy)
        .replace('{date}', reviewedAt.toISOString().slice(0, 10))}
    </p>
  );
}
