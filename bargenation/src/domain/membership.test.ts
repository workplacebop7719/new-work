/**
 * These tests guard the two things about membership that can quietly go
 * wrong: the price drifting out of one file into prose, and the benefit list
 * growing something §52 forbids.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  MONTHLY_PRICE_CENTS, MEMBERSHIP_PURCHASABLE, MEMBER_BENEFITS, MEMBERSHIP_NEVER, monthlyPrice,
} from './membership';

describe('the price', () => {
  it('is a whole number of cents, not a float', () => {
    expect(Number.isInteger(MONTHLY_PRICE_CENTS)).toBe(true);
  });

  it('formats from the single source rather than a literal', () => {
    expect(monthlyPrice()).toBe('$7.99');
  });

  /**
   * The failure this catches is a real one and it has a shape: somebody adds
   * a marketing paragraph, types the price into it, the price later changes
   * in this file, and one page now contradicts another. A customer who reads
   * the cheaper one is entitled to believe it.
   *
   * Scoped to src/app and src/components, and to a price-shaped literal, so
   * it fails on the thing it is about rather than on any number in the UI.
   */
  it('appears nowhere in the UI as a hard-coded literal', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { walk(path); continue; }
        if (!/\.tsx?$/.test(path)) continue;
        if (path.endsWith('membership.test.ts')) continue;
        const body = readFileSync(path, 'utf8');
        // Any dollar amount between $1 and $99.99 written into UI prose.
        for (const match of body.matchAll(/\$\d{1,2}\.\d{2}\b/g)) {
          offenders.push(`${path}: ${match[0]}`);
        }
      }
    };
    walk('src/app');
    walk('src/components');
    expect(offenders).toEqual([]);
  });
});

describe('what money cannot buy (§52)', () => {
  it('makes no benefit claim about a score, a call, a rank or a queue', () => {
    const forbidden = /\b(index|score|rank|ranking|featured|standout|sooner|earlier|first|priority|queue)\b/i;
    for (const benefit of MEMBER_BENEFITS) {
      // The detail may DENY these — "not a lower bar", "same instant" — but a
      // benefit TITLE promising one is the thing that must never ship.
      expect(benefit.title).not.toMatch(forbidden);
    }
  });

  it('states the exclusions rather than only asserting them in a comment', () => {
    expect(MEMBERSHIP_NEVER.length).toBeGreaterThanOrEqual(4);
    expect(MEMBERSHIP_NEVER.join(' ')).toMatch(/Value Index/);
    expect(MEMBERSHIP_NEVER.join(' ')).toMatch(/same instant/i);
  });

  it('links every benefit to a route that exists', () => {
    for (const benefit of MEMBER_BENEFITS) {
      const route = join('src/app', benefit.href, 'page.tsx');
      expect(() => statSync(route), `${benefit.href} is claimed but not built`).not.toThrow();
    }
  });
});

describe('nothing pretends to take money', () => {
  it('is not purchasable while no provider is configured', () => {
    expect(MEMBERSHIP_PURCHASABLE).toBe(false);
  });

  /**
   * §01, enforced rather than remembered: while the flag is false, the page
   * must not render a control that looks like a checkout.
   */
  it('renders no purchase control on the membership page', () => {
    const page = readFileSync('src/app/membership/page.tsx', 'utf8');
    expect(page).not.toMatch(/<button/i);
    expect(page).not.toMatch(/\b(Subscribe|Join now|Upgrade|Start (your )?(free )?trial|Buy now|Checkout)\b/);
    // And it has to say why, in its own words.
    expect(page).toMatch(/can’t buy this yet/i);
  });
});
