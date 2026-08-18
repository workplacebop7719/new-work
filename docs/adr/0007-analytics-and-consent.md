# ADR-0007 — Analytics, consent and measurement

- **Status:** Accepted (CC-01)
- **Date:** 2026-08-18
- **Deciders:** Product lead (accountable), privacy lead, engineering lead
- **Blocks:** CC-02
- **PRD basis:** §7 PUB-006; §19 Core event taxonomy + Experiment guardrails; §16 Privacy; §17 Observability; §27 constraint 3

## Context

PUB-006 is stricter than a cookie banner: **non-essential analytics must not load before valid consent**, opt-out must persist, and equivalent service must remain available. §19 additionally forbids raw document content and unnecessary personal data in events, and §27 forbids storage keys, sequential tenant IDs, internal margins and private audit notes from reaching analytics at all.

There is also a measurement obligation that pulls the other way: the whole Gate 0 decision (§20) depends on knowing conversion, drop-off *by language and assistive-technology signal*, and how many buyers self-serve to the official Ontario source instead of purchasing.

So: the analytics design must be able to answer the Gate 0 questions using only consented, minimized data — and must degrade honestly when consent is absent, rather than pretending the numbers are complete.

## Decision

**Server-side, first-party event pipeline with a typed event contract; third-party analytics scripts are consent-gated and optional.**

1. **Event contract in code.** The §19 taxonomy (`source_viewed`, `employee_band_selected`, `qualifier_started`, `qualifier_answered`, `qualifier_completed`, `result_viewed`, `official_source_opened`, `assessment_selected`, `booking_started`, `purchase_completed`, `evidence_requested`, `evidence_uploaded`, `finding_viewed`, `task_assigned`, `change_order_accepted`, `report_released`, `export_requested`, `support_contacted`) is defined as typed schemas in `/packages/observability`. Emitting an undeclared event or an undeclared property fails typecheck; payload shape is asserted in tests (ANL-001).
2. **Property allowlist and denylist.** Each event declares its permitted properties. A shared denylist rejects anything matching storage keys, signed URLs, email addresses, file names, document text, internal cost/margin fields and raw tenant identifiers (ANL-002, ENG-003). Violations fail CI, not review.
3. **Two consent tiers.**
   - *Essential* (no consent required): server-side operational telemetry — errors, latency, security audit events, and aggregate counts with no cross-session identifier. This is what keeps the product debuggable and secure for a user who refuses everything.
   - *Non-essential* (explicit opt-in): product analytics with a persistent visitor identifier, attribution, and any third-party script.
4. **No third-party analytics script loads before opt-in.** Consent state is checked server-side; the script tag is simply not rendered. This is asserted in `test:e2e` by failing the test if any request to a non-allowlisted host occurs before consent (a network assertion, not a code review).
5. **Opt-out is durable and honoured server-side**, so clearing cookies does not silently re-enable tracking for a signed-in user; the preference lives on the user record as well as in local storage.
6. **Personalization without tracking.** PUB-002's employee-band/sector personalization is a functional preference, stored in a first-party essential cookie with a clear purpose string, and is *not* used for analytics identity unless non-essential consent exists.
7. **`official_source_opened` is treated as a first-class success metric**, not a leak. Per §2, buyers can self-serve; measuring how often they do is how the "willingness to pay over free filing" assumption gets tested (assumptions register §C).
8. **Assistive-technology signals are never fingerprinted.** §19 permits stratification "only when privacy-safe". Decision: we do not sniff AT. We measure accessibility experience through the paid panel (ACC-010), through explicit user-provided preferences, and through completion-rate differences on keyboard-only journeys in synthetic tests. Any change to this needs privacy-lead approval.
9. **Experiment intake.** No experiment runs without a written primary metric, harm metrics and a stopping rule (ANL-004); the intake form encodes the §19 prohibitions (no fear, shame, misleading deadlines, inaccessible variants, hidden costs) as blocking checkboxes with named approvers.
10. **Analytics never sees portal document content.** Portal events carry object IDs and states, never titles or bodies.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Client-side analytics SDK (GA4, Amplitude, Mixpanel) as primary | Fast, rich, familiar. Rejected as primary: consent gating becomes a race with script load, ad-blockers distort the Gate 0 numbers we are betting CA$5M on, and payload control moves outside our tests. Permitted as an *additional* consented destination. |
| Cookieless "privacy-friendly" analytics only (Plausible/Fathom-style) | Attractive and defensible; insufficient alone for funnel analysis across the qualifier's multi-step, save-and-resume journey (CNV-001). Reasonable as a supplementary public-site measure. |
| Consent-mode / "anonymous ping before consent" | Common industry practice; still loads a third-party script and still transmits before consent. Rejected as inconsistent with PUB-006's plain reading. |
| Session recording / heatmaps | Would capture evidence content and PII in the portal, and possibly AT interaction patterns. Rejected for authenticated surfaces outright; public-site use requires a PIA and is not planned. |
| Self-hosted warehouse from day one | Highest control; operational burden before there is data volume. Deferred: events are written first-party, so migrating the destination later is an adapter change. |

## Consequences

- **Positive:** Gate 0 metrics come from server-side events that ad-blockers cannot suppress, so the capital decision rests on complete data for consented users.
- **Positive:** privacy review reads one schema file to see everything the platform measures.
- **Negative:** we lose some behavioural richness (scroll depth, rage clicks) that client SDKs give cheaply. Accepted.
- **Negative:** non-consented users are visible only as aggregates, so funnel numbers understate reality. Mitigation: report consent rate alongside every funnel figure so the team never mistakes a consent drop for a conversion drop.
- **Negative:** the denylist will occasionally block a genuinely useful property. That is the correct default.

## Requirements satisfied

PUB-002, PUB-006, CNV-004, ANL-001, ANL-002, ANL-003, ANL-004, ANL-005, SEC-012, ARC-007, ENG-003.

## Review triggers

Revisit if: consent rates are so low that Gate 0 measurement is unreliable; a warehouse becomes necessary for cohort analysis (§19 retention); or a vendor offers a genuinely consent-safe client SDK with Canadian residency.
