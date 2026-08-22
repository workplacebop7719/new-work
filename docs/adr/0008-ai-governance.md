# ADR-0008 — AI capabilities, provenance and safeguards

- **Status:** Accepted (CC-01)
- **Date:** 2026-08-18
- **Deciders:** Product lead (accountable), accessibility lead, security/privacy lead, AODA specialist
- **Blocks:** CC-08 (and constrains every earlier slice by prohibition)
- **PRD basis:** §12 in full; §27 constraint 2; §3 non-goals; §25 "AI overreach"

## Context

§12 permits six AI capabilities, each with a named human control and named prohibited uses. §27 adds the hardest constraint: **evidence-file contents are never sent to an AI provider by default** — an approved task, a minimal payload, a client policy check and logged provenance are all required.

The risk is not that AI is unhelpful here; it is that a hallucinated regulatory statement or a fabricated citation inside an "expert-reviewed" report is precisely the failure mode that destroys the business's only real asset (§25 "Regulatory misstatement", "AI overreach").

## Decision

**A capability registry that makes every AI call a declared, typed, policy-checked, provenance-logged task — and makes anything undeclared impossible.**

1. **No AI in CC-01 through CC-07** (assumption A-24). No convenience LLM call ships before the governance stack exists.
2. **Capability registry.** Each of the six §12 capabilities is a declared entry: identifier, permitted inputs, prompt-template version, required human control, disposition states, and prohibited-output checks. There is **one** code path to a model provider, and it refuses any request that does not reference a registered capability. A generic "ask the model" helper does not exist.
3. **Four preconditions per call**, all enforced server-side and all logged:
   - an approved *task* (a human-initiated, typed request — never an automatic background inference on client data);
   - a *minimal payload* (structured fields, not whole documents; the payload is assembled by capability-specific code, never by passing an object through);
   - a *client policy check* (organization-level and document-level "AI not used" settings, stricter wins — AIG-004);
   - *provenance capture* written in the same transaction (AIG-002).
4. **Evidence file contents are never the payload by default.** Where a capability genuinely needs document text (document classifier), it operates on extracted, redacted text under an explicit per-document approval, and that approval is an audit event.
5. **Redaction before processing** (AIG-005) with golden-file tests over synthetic documents seeded with identifiers; a redaction miss fails CI (A-26).
6. **Human control is a state machine, not a checkbox.** AI output enters as `suggested`, and cannot reach client-visible state without a named reviewer's `approved` transition. Report assembly (the highest-risk capability) additionally requires the release gate (OPS-011) and a named qualified reviewer — the same person cannot both generate and approve where §18 segregation applies (DAT-004).
7. **Citation integrity.** Any output referencing a source must reference a *registered* regulatory claim ID (ADR-0005). Free-text citations are rejected by a post-processing validator — this is the direct control against fabricated citations, and it is a machine check rather than a reviewer's vigilance.
8. **Uncertainty is surfaced, never smoothed.** Outputs carry a coverage indicator and an explicit "drafted with AI assistance, reviewed by <name>" attribution wherever they reach a client (AIG-007). Never presented as independent expert review.
9. **Contractor matching (§12) excludes protected attributes and opaque behavioural scores by construction**: the ranking function takes only verified skill, capacity, language and conflict status as inputs, the factors are inspectable by the PM, and the input list is asserted in a test (AIG-008).
10. **Provider terms.** Enterprise agreement prohibiting training on our data, with tenant segregation and a documented region (Q-17). No provider is used without this in writing. Provider access sits behind a port in `/packages/integrations` (ARC-002).
11. **Evaluation before release** (AIG-006): an eval suite per capability covering hallucination, source mismatch, overconfident phrasing, plain-language/reading-level checks, bias probes and leakage attempts. Evals run in CI and gate the capability's flag.
12. **A global kill switch** disables all AI capabilities without a deploy, and the product remains fully functional with them off — every AI assist has a manual path.

## Alternatives considered

| Alternative | Why not |
|---|---|
| General-purpose assistant in the portal | Directly violates §3 ("no general-purpose legal-advice chatbot") and makes payload control impossible. Rejected. |
| RAG over the client's entire evidence vault | The obvious product instinct, and the fastest route to a §27 constraint-2 violation: it sends evidence contents by default. Rejected. If revisited, it needs per-document approval semantics and a client-controlled index with deletion propagation. |
| Fine-tuning on client deliverables | Best output quality; unacceptable data-use posture and a hard conflict with "no training on client data". Rejected. |
| Trusting reviewer diligence instead of machine checks on citations | Reviewers miss fabricated citations — that is exactly the documented failure mode. Rejected in favour of the registered-claim validator. |
| Shipping AI assists earlier (CC-05 report drafting) for velocity | Tempting, since report assembly is the biggest time cost. Rejected: report assembly is also the highest-consequence capability, and it would arrive before the provenance and eval stack. |
| On-device/self-hosted model to avoid the provider question | Removes the third-party data-processing concern; adds infrastructure and materially weaker quality at this budget. Reconsider only if residency review blocks every acceptable provider. |

## Consequences

- **Positive:** every client-facing AI-touched artefact can answer "which model, which prompt version, which inputs, who approved it" — the §12 governance requirement — from a record, not a reconstruction.
- **Positive:** the kill switch means an incident is a configuration change, not an outage.
- **Negative:** the registry makes adding a capability deliberately slow (schema, redaction rules, evals, review states). Accepted; §12 is a list of six, not an open platform.
- **Negative:** minimal structured payloads produce weaker outputs than dumping full context. Accepted trade; quality is recovered through better structure, not more data.
- **Risk:** if no provider offers acceptable terms with acceptable residency, CC-08's AI scope is cut and the care-plan/reporting slices deliver without assists. That is a survivable outcome and should be stated to the steering committee as such rather than resolved by weakening the constraint.

## Requirements satisfied

AIG-001 through AIG-008, ENG-002, DAT-004, OPS-011, CNT-008, SEC-007.

## Review triggers

Revisit if: provider terms or residency change; an eval regression appears in production output; override rates (§25 early indicator) rise, which signals the capability is not earning its governance cost.
