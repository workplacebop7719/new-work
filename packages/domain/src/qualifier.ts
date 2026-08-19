/**
 * The readiness qualifier — PRD §8, CNV-001 to CNV-004.
 *
 * ## The line this module must not cross
 *
 * §8: "The qualifier is a guided routing tool, not a legal determination."
 * §12 prohibits "issuing a legal determination or compliance status."
 *
 * The working rule (assumptions register Q-21, pending AODA specialist sign-off):
 * the qualifier may state **what is likely in scope** and **what to do next**.
 * It may never state whether an obligation is met, and it may never use the words
 * compliant, non-compliant, pass or fail. `assertNoConclusion` enforces the second
 * half of that mechanically, and is exercised over every rule's output in tests.
 *
 * ## Why the engine is here and not in the app
 *
 * CNV-002 requires every recommendation to show the inputs and the rule category
 * that produced it. That is only auditable if the rules are versioned, pure and
 * server-side (assumption A-02): a result computed in the browser cannot be
 * reproduced later from a stored answer set.
 */
import { z } from 'zod';
import { EMPLOYEE_BANDS, ORGANIZATION_TYPES } from './entities';

/**
 * Bumped whenever a rule changes. Stored with every result so a recommendation
 * made months ago can be reproduced exactly, which is what makes the sales
 * handoff (CNV-004) and any later dispute answerable.
 */
export const RULE_VERSION = '2026.08.1';

export const QUESTION_KEYS = [
  'ontario_presence',
  'organization_type',
  'employee_band',
  'reporting_history',
  'public_website',
  'website_work_done',
  'evidence_availability',
  'support_needed',
] as const;

export type QuestionKey = (typeof QUESTION_KEYS)[number];

export const answers = z.object({
  ontario_presence: z.enum(['yes', 'no', 'unsure']).optional(),
  organization_type: z.enum(ORGANIZATION_TYPES).optional(),
  employee_band: z.enum(EMPLOYEE_BANDS).optional(),
  reporting_history: z.enum(['filed_recently', 'filed_long_ago', 'never_filed', 'unsure']).optional(),
  public_website: z.enum(['yes_we_own', 'yes_vendor_managed', 'no', 'unsure']).optional(),
  website_work_done: z.enum(['audit_done', 'some_fixes', 'nothing_yet', 'unsure']).optional(),
  evidence_availability: z.enum(['organized', 'scattered', 'unknown']).optional(),
  support_needed: z
    .array(z.enum(['web_audit', 'documents', 'policy', 'training', 'project_management', 'not_sure']))
    .optional(),
});

export type Answers = z.infer<typeof answers>;

export const RESULT_CATEGORIES = [
  'likely_self_serve',
  'assessment_fit',
  'specialist_fit',
  'uncertain',
] as const;
export type ResultCategory = (typeof RESULT_CATEGORIES)[number];

export interface RuleTraceEntry {
  /** The question that mattered, so the result can be explained by pointing at it. */
  readonly questionKey: QuestionKey;
  readonly answer: string;
  /** Plain-language reason. Never a legal statement. */
  readonly because: string;
}

export interface QualifierResult {
  readonly category: ResultCategory;
  readonly ruleVersion: string;
  /** CNV-002: the inputs that produced the result. */
  readonly trace: readonly RuleTraceEntry[];
  /**
   * CNV-002 requires an uncertainty notice on every recommendation — not only on
   * the uncertain category. A confident-looking routing decision is still a
   * routing decision.
   */
  readonly uncertainty: string;
  /** True when a human must look before anything is quoted (§8 routing table). */
  readonly requiresHumanReview: boolean;
}

/** Words that would turn routing into a determination. */
const CONCLUSION_WORDS =
  /\b(compliant|non-?compliant|compliance status|certified|pass(ed|es)?|fail(ed|s)?|in breach|violat(es|ion)|exempt|not required by law|legally)\b/i;

export class ConclusionLeakError extends Error {}

/**
 * Guards user-facing qualifier text. Applied to every rule's output in tests and
 * at the boundary in the app, because the failure mode here is a sentence, not a
 * bug — and a sentence is easy to add without noticing.
 */
export function assertNoConclusion(text: string): void {
  const match = CONCLUSION_WORDS.exec(text);
  if (match) {
    throw new ConclusionLeakError(
      `Qualifier text may not state a compliance conclusion (found "${match[0]}"). ` +
        'The qualifier routes; it does not determine. See PRD §8 and question Q-21.',
    );
  }
}

const UNCERTAINTY_STANDARD =
  'This is a routing suggestion based only on what you told us. It is not a legal opinion and it does not tell you whether your organization meets any requirement. A qualified reviewer confirms scope before any work is quoted.';

const UNCERTAINTY_INCOMPLETE =
  'You have not answered every question yet, so this suggestion may change. It is not a legal opinion and it does not tell you whether your organization meets any requirement.';

export function isComplete(input: Answers): boolean {
  return QUESTION_KEYS.every((key) => {
    const value = input[key];
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  });
}

/**
 * Evaluates the routing rules.
 *
 * Deliberately ordered most-cautious-first: any signal that a human should look
 * wins over any signal that would produce a sales-ready category. The business
 * cost of routing a good lead to a conversation is small; the cost of routing an
 * uncertain case to an automated recommendation is the §25 "Regulatory
 * misstatement" risk.
 */
export function evaluate(input: Answers): QualifierResult {
  const trace: RuleTraceEntry[] = [];
  const complete = isComplete(input);

  const result = (
    category: ResultCategory,
    requiresHumanReview: boolean,
  ): QualifierResult => ({
    category,
    ruleVersion: RULE_VERSION,
    trace,
    uncertainty: complete ? UNCERTAINTY_STANDARD : UNCERTAINTY_INCOMPLETE,
    requiresHumanReview,
  });

  // 1. Outside the service area. Said plainly, with no attempt to keep the lead.
  if (input.ontario_presence === 'no') {
    trace.push({
      questionKey: 'ontario_presence',
      answer: 'no',
      because: 'We work with organizations operating in Ontario, and you told us yours does not.',
    });
    return result('likely_self_serve', false);
  }

  // 2. Anything the visitor is unsure about goes to a person. "Unsure" is the
  //    most informative answer in the whole qualifier and must not be averaged away.
  const unsureKeys = (
    ['ontario_presence', 'reporting_history', 'public_website', 'website_work_done'] as const
  ).filter((key) => input[key] === 'unsure');
  if (unsureKeys.length > 0) {
    for (const key of unsureKeys) {
      trace.push({
        questionKey: key,
        answer: 'unsure',
        because: 'You told us you were not sure, so a person should look at this rather than a rule.',
      });
    }
    return result('uncertain', true);
  }

  // 3. Smallest organizations: point at the free official route without friction.
  if (input.employee_band === 'under_20') {
    trace.push({
      questionKey: 'employee_band',
      answer: 'under_20',
      because:
        'Organizations of your size usually have fewer obligations, and the official guidance is often enough. We would rather say so than sell you something.',
    });
    return result('likely_self_serve', false);
  }

  // 4. A clear specialist need beats a general assessment: selling a diagnosis to
  //    someone who has already diagnosed themselves wastes their money.
  const needs = input.support_needed ?? [];
  const specialistNeeds = needs.filter((n) => n === 'web_audit' || n === 'documents');
  if (
    specialistNeeds.length > 0 &&
    input.website_work_done === 'audit_done' &&
    input.evidence_availability === 'organized'
  ) {
    trace.push({
      questionKey: 'support_needed',
      answer: specialistNeeds.join(', '),
      because: 'You named specific specialist work.',
    });
    trace.push({
      questionKey: 'website_work_done',
      answer: 'audit_done',
      because: 'You have already had an audit, so a further diagnosis would repeat what you know.',
    });
    return result('specialist_fit', true);
  }

  // 5. Scattered or unknown evidence is exactly what the assessment is for.
  if (input.evidence_availability === 'scattered' || input.evidence_availability === 'unknown') {
    trace.push({
      questionKey: 'evidence_availability',
      answer: input.evidence_availability,
      because:
        'You told us your evidence is not gathered in one place. Finding out what exists and what is missing is what the readiness assessment does.',
    });
    if (input.employee_band) {
      trace.push({
        questionKey: 'employee_band',
        answer: input.employee_band,
        because: 'Your size band shapes which requirements are worth checking first.',
      });
    }
    return result('assessment_fit', false);
  }

  if (!complete) {
    return result('uncertain', true);
  }

  trace.push({
    questionKey: 'evidence_availability',
    answer: input.evidence_availability ?? 'unknown',
    because: 'Your answers did not match a clear routing rule, so a person should look.',
  });
  return result('uncertain', true);
}
