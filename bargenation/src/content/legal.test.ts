import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  requiredDetails, missingDetails, detail, LAWYER_REVIEWED, LEGAL_DOCUMENTS,
} from './legal';

afterEach(() => {
  vi.unstubAllEnvs();
});

const unsetAll = () => {
  for (const d of requiredDetails()) vi.stubEnv(d.envVar, '');
};

describe('a missing detail stays missing', () => {
  it('reports null rather than a placeholder when unset', () => {
    unsetAll();
    for (const d of requiredDetails()) {
      expect(d.value, d.key).toBeNull();
    }
  });

  it('treats whitespace as unset', () => {
    vi.stubEnv('NEXT_PUBLIC_LEGAL_ENTITY', '   ');
    expect(detail('entity')).toBeNull();
  });

  it('lists every unset detail as outstanding', () => {
    unsetAll();
    expect(missingDetails()).toHaveLength(requiredDetails().length);
  });

  it('uses a supplied value when there is one', () => {
    vi.stubEnv('NEXT_PUBLIC_LEGAL_ENTITY', 'Some Real Company Ltd');
    expect(detail('entity')).toBe('Some Real Company Ltd');
    expect(missingDetails().some((d) => d.key === 'entity')).toBe(false);
  });

  it('explains why each missing detail matters', () => {
    // A gap a reader cannot interpret is only slightly better than a fake value.
    for (const d of requiredDetails()) {
      expect(d.purpose.length, d.key).toBeGreaterThan(20);
      expect(d.label.length, d.key).toBeGreaterThan(3);
    }
  });
});

describe('review status cannot be self-asserted', () => {
  /**
   * "Reviewed by a lawyer" is a claim about something that happened in the
   * world. If a deployment could set it, the claim would mean nothing.
   */
  it('is false, and not derived from the environment', () => {
    expect(LAWYER_REVIEWED).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_REVIEWED', 'true');
    expect(LAWYER_REVIEWED).toBe(false);
  });
});

describe('documents', () => {
  it('each carries a title, a summary and a draft date', () => {
    for (const [key, doc] of Object.entries(LEGAL_DOCUMENTS)) {
      expect(doc.slug, key).toBe(key);
      expect(doc.title.length, key).toBeGreaterThan(2);
      expect(doc.summary.length, key).toBeGreaterThan(20);
      expect(Number.isNaN(new Date(doc.drafted).getTime()), key).toBe(false);
    }
  });

  it('covers the three routes the footer links to', () => {
    expect(Object.keys(LEGAL_DOCUMENTS).sort()).toEqual(['disclosures', 'privacy', 'terms']);
  });
});
