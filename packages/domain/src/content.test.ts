/**
 * CNT-005 / ENG-007: stale regulatory content must fail safe.
 *
 * The negative tests here are the point of the module. A claim that has passed
 * its review date must not render, and the test asserts that its text is
 * unreachable rather than merely that a flag was set.
 */
import { describe, expect, it } from 'vitest';
import {
  assertPublishable,
  ClaimNotPublishableError,
  effectiveStatus,
  regulatoryClaim,
  resolveClaim,
  type RegulatoryClaim,
} from './content';

const NOW = new Date('2026-09-01T00:00:00Z');

function claim(overrides: Partial<RegulatoryClaim> = {}): RegulatoryClaim {
  return regulatoryClaim.parse({
    id: 'clm_1',
    claimKey: 'on.reporting.deadline',
    version: 1,
    jurisdiction: 'CA-ON',
    statementEn: 'Some organizations must file an accessibility compliance report by December 31, 2026.',
    statementFr: null,
    sourceUrl: 'https://www.ontario.ca/page/completing-your-accessibility-compliance-report',
    sourceTitle: 'Ontario — Completing your accessibility compliance report',
    effectiveDate: '2026-01-01',
    lastVerifiedAt: '2026-08-18',
    nextReviewAt: '2026-11-01',
    reviewerUserId: 'usr_reviewer',
    secondReviewerUserId: 'usr_specialist',
    status: 'published',
    ...overrides,
  });
}

describe('automatic hold (CNT-005)', () => {
  it('renders a published, in-date claim', () => {
    const resolved = resolveClaim(claim(), 'en', NOW);
    expect(resolved.kind).toBe('statement');
  });

  it('holds a claim whose review date has passed, without any job running', () => {
    const stale = claim({ nextReviewAt: new Date('2026-08-01T00:00:00Z') });
    expect(effectiveStatus(stale, NOW)).toBe('hold');
    const resolved = resolveClaim(stale, 'en', NOW);
    expect(resolved.kind).toBe('hold');
    // The statement text is not reachable on the hold branch at all — a caller
    // cannot render it by ignoring a boolean.
    expect(Object.hasOwn(resolved, 'text')).toBe(false);
  });

  it('still points the reader at the official source while on hold', () => {
    const resolved = resolveClaim(claim({ status: 'draft' }), 'en', NOW);
    expect(resolved.sourceUrl).toContain('ontario.ca');
  });

  it('holds a claim that has only one reviewer (PRD §20 two-person review)', () => {
    expect(resolveClaim(claim({ secondReviewerUserId: null }), 'en', NOW).kind).toBe('hold');
  });

  it('never renders a retired claim', () => {
    expect(resolveClaim(claim({ status: 'retired' }), 'en', NOW).kind).toBe('hold');
  });
});

describe('bilingual behaviour (PUB-001, CNT-002)', () => {
  it('declares a missing French translation rather than hiding it', () => {
    const resolved = resolveClaim(claim(), 'fr', NOW);
    expect(resolved.kind).toBe('statement');
    if (resolved.kind !== 'statement') throw new Error('unreachable');
    expect(resolved.translationMissing).toBe(true);
    expect(resolved.locale).toBe('en');
  });

  it('uses the French statement when one exists', () => {
    const resolved = resolveClaim(claim({ statementFr: 'Déclaration en français.' }), 'fr', NOW);
    if (resolved.kind !== 'statement') throw new Error('unreachable');
    expect(resolved.translationMissing).toBe(false);
    expect(resolved.text).toBe('Déclaration en français.');
  });
});

describe('publish guard', () => {
  it('refuses to publish without two reviewers', () => {
    expect(() => assertPublishable(claim({ reviewerUserId: null }), NOW)).toThrow(ClaimNotPublishableError);
  });

  it('refuses to publish a claim whose review date has already passed', () => {
    expect(() => assertPublishable(claim({ nextReviewAt: new Date('2026-08-01') }), NOW)).toThrow(
      /review date has passed/,
    );
  });

  it('allows a properly reviewed, in-date claim', () => {
    expect(() => assertPublishable(claim(), NOW)).not.toThrow();
  });
});

describe('provenance is always present (PUB-004)', () => {
  it('carries source, jurisdiction, version and last-verified date on every rendered statement', () => {
    const resolved = resolveClaim(claim(), 'en', NOW);
    if (resolved.kind !== 'statement') throw new Error('unreachable');
    expect(resolved.sourceUrl).toBeTruthy();
    expect(resolved.sourceTitle).toBeTruthy();
    expect(resolved.jurisdiction).toBe('CA-ON');
    expect(resolved.version).toBe(1);
    expect(resolved.lastVerifiedAt).toBeInstanceOf(Date);
  });
});
