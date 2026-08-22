/**
 * The qualifier's job is to route, never to determine (PRD §8, §12).
 *
 * The most important test in this file is the last one: it runs every rule's
 * user-facing output through the conclusion guard, so a future edit that adds a
 * reassuring sentence like "you are compliant" fails here rather than shipping.
 */
import { describe, expect, it } from 'vitest';
import {
  assertNoConclusion,
  ConclusionLeakError,
  evaluate,
  isComplete,
  QUESTION_KEYS,
  RULE_VERSION,
  type Answers,
} from './qualifier';

const complete: Answers = {
  ontario_presence: 'yes',
  organization_type: 'private_school',
  employee_band: '50_to_199',
  reporting_history: 'never_filed',
  public_website: 'yes_we_own',
  website_work_done: 'nothing_yet',
  evidence_availability: 'scattered',
  support_needed: ['web_audit'],
};

describe('routing (PRD §8)', () => {
  it('sends an organization outside Ontario to the self-serve path, plainly', () => {
    const result = evaluate({ ...complete, ontario_presence: 'no' });
    expect(result.category).toBe('likely_self_serve');
    expect(result.requiresHumanReview).toBe(false);
  });

  it('routes the smallest organizations to the free official route', () => {
    const result = evaluate({ ...complete, employee_band: 'under_20' });
    expect(result.category).toBe('likely_self_serve');
  });

  it('treats "unsure" as a reason to involve a person, never as a soft yes', () => {
    for (const key of ['ontario_presence', 'reporting_history', 'public_website', 'website_work_done'] as const) {
      const result = evaluate({ ...complete, [key]: 'unsure' });
      expect(result.category, `${key} = unsure`).toBe('uncertain');
      expect(result.requiresHumanReview).toBe(true);
    }
  });

  it('does not sell a diagnosis to someone who has already been diagnosed', () => {
    const result = evaluate({
      ...complete,
      website_work_done: 'audit_done',
      evidence_availability: 'organized',
      support_needed: ['web_audit'],
    });
    expect(result.category).toBe('specialist_fit');
    expect(result.requiresHumanReview).toBe(true);
  });

  it('recommends the assessment when evidence is scattered', () => {
    expect(evaluate(complete).category).toBe('assessment_fit');
  });

  it('prefers caution over a sales-ready category when signals conflict', () => {
    // Unsure about the website, but otherwise an ideal assessment lead.
    const result = evaluate({ ...complete, public_website: 'unsure' });
    expect(result.category).toBe('uncertain');
  });
});

describe('explainability (CNV-002)', () => {
  it('shows the inputs that produced the result', () => {
    const result = evaluate(complete);
    expect(result.trace.length).toBeGreaterThan(0);
    for (const entry of result.trace) {
      expect(QUESTION_KEYS).toContain(entry.questionKey);
      expect(entry.because.length).toBeGreaterThan(10);
    }
  });

  it('stamps the rule version so a result can be reproduced later', () => {
    expect(evaluate(complete).ruleVersion).toBe(RULE_VERSION);
  });

  it('carries an uncertainty notice on every result, not just uncertain ones', () => {
    const categories = new Set<string>();
    const cases: Answers[] = [
      complete,
      { ...complete, ontario_presence: 'no' },
      { ...complete, employee_band: 'under_20' },
      { ...complete, public_website: 'unsure' },
      { ...complete, website_work_done: 'audit_done', evidence_availability: 'organized' },
    ];
    for (const input of cases) {
      const result = evaluate(input);
      categories.add(result.category);
      expect(result.uncertainty).toContain('not a legal opinion');
    }
    // All four categories are reachable.
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it('flags an incomplete answer set differently from a complete one', () => {
    const partial = evaluate({ ontario_presence: 'yes', employee_band: '50_to_199' });
    expect(isComplete({ ontario_presence: 'yes' })).toBe(false);
    expect(partial.uncertainty).toContain('not answered every question');
  });
});

describe('the qualifier never issues a determination (§8, §12, Q-21)', () => {
  it('rejects conclusion language', () => {
    expect(() => assertNoConclusion('Your organization is compliant.')).toThrow(ConclusionLeakError);
    expect(() => assertNoConclusion('You passed the accessibility check.')).toThrow(ConclusionLeakError);
    expect(() => assertNoConclusion('You are exempt from this requirement.')).toThrow(ConclusionLeakError);
  });

  it('permits routing language', () => {
    expect(() =>
      assertNoConclusion('A readiness assessment looks like the right next step for you.'),
    ).not.toThrow();
  });

  it('produces no conclusion language across every reachable rule path', () => {
    const permutations: Answers[] = [];
    for (const presence of ['yes', 'no', 'unsure'] as const) {
      for (const band of ['under_20', '20_to_49', '50_to_199', '200_plus'] as const) {
        for (const evidence of ['organized', 'scattered', 'unknown'] as const) {
          for (const work of ['audit_done', 'some_fixes', 'nothing_yet', 'unsure'] as const) {
            permutations.push({
              ...complete,
              ontario_presence: presence,
              employee_band: band,
              evidence_availability: evidence,
              website_work_done: work,
            });
          }
        }
      }
    }

    for (const input of permutations) {
      const result = evaluate(input);
      assertNoConclusion(result.uncertainty);
      for (const entry of result.trace) assertNoConclusion(entry.because);
    }
    expect(permutations.length).toBe(144);
  });
});
