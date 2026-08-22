/**
 * SOURCE ADAPTERS (PRD §44, §46).
 *
 * Every data source sits behind this port, so the pipeline never knows whether
 * a record came from a retailer API, an affiliate feed, or a permitted crawl.
 * Adding a source means writing an adapter, not touching the pipeline.
 *
 * §44 ranks sources and requires that we respect terms of service, robots
 * directives and rate limits. That is an adapter's responsibility — the port
 * requires each one to declare its tier and its politeness constraints, so a
 * source cannot be added without someone answering those questions.
 *
 * Records arrive UNVALIDATED and untyped beyond `unknown`. Nothing downstream
 * may assume a feed is well-formed; normalise.ts is the only place that turns
 * raw values into facts.
 */
import type { SourceTier } from '@/domain/confidence';

/** One raw row from a feed, exactly as the source gave it to us. */
export interface RawRecord {
  /** Free-form; the shape is the source's business, not ours. */
  [key: string]: unknown;
}

export interface SourcePort {
  /** Matches data_sources.name. */
  readonly slug: string;
  /** §44 priority ladder. Feeds Confidence, so it must be honest. */
  readonly tier: SourceTier;
  /**
   * Minimum delay between requests this source permits. Declared rather than
   * inferred, so nobody has to guess what a retailer agreed to.
   */
  readonly minRequestIntervalMs: number;
  /** Where the permission to read this source comes from. */
  readonly basis: 'contract' | 'affiliate-programme' | 'public-feed' | 'permitted-crawl';

  fetch(): Promise<RawRecord[]>;
}

/**
 * A development source. Returns whatever it is constructed with, including
 * deliberately malformed rows, so the pipeline's refusals can be exercised
 * without a network or a real retailer relationship.
 */
export function createFakeSource(options: {
  slug: string;
  tier: SourceTier;
  records: RawRecord[];
}): SourcePort {
  return {
    slug: options.slug,
    tier: options.tier,
    minRequestIntervalMs: 0,
    basis: 'public-feed',
    async fetch() {
      return options.records;
    },
  };
}
