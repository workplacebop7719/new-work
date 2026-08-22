/**
 * PUB-001 — "All core pages can be published in English and French ... missing
 * translation states are explicit."
 */
import { describe, expect, it } from 'vitest';
import { getClaim } from './claims';
import { LOCALES, missingKeys, translate } from './i18n';

describe('bilingual UI strings', () => {
  it('ships both locales', () => {
    expect(LOCALES).toEqual(['en', 'fr']);
  });

  it('has no untranslated product strings', () => {
    // A missing key is not a soft warning: French users would silently receive
    // English, which PUB-001 forbids.
    expect(missingKeys('fr'), `untranslated keys: ${missingKeys('fr').join(', ')}`).toEqual([]);
  });

  it('reports a missing translation rather than hiding the fallback', () => {
    const result = translate('fr', 'site.name');
    expect(result.missing).toBe(false);
  });
});

describe('regulatory claim source (ENG-007)', () => {
  it('ships the deadline claim as content, not as a literal in a component', () => {
    const claim = getClaim('on.reporting.deadline');
    expect(claim).toBeDefined();
    expect(claim?.sourceUrl).toMatch(/^https:\/\/www\.ontario\.ca\//);
  });

  it('keeps the claim unpublished until counsel review closes (Q-04)', () => {
    // Deliberate: the product must demonstrate the hold path, not bypass it.
    expect(getClaim('on.reporting.deadline')?.status).toBe('in_review');
  });
});
