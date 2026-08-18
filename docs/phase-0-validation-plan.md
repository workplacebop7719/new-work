# Phase 0 — paid validation and prototype plan

- **Status:** Draft for approval
- **Window:** Weeks 1–6 (PRD §20)
- **Capital released:** CA$250,000 of CA$5,000,000
- **Decision it produces:** Gate 0 — proceed to Phase 1 (cumulative CA$1.50M) or stop/re-scope
- **PRD basis:** §1 Executive decision; §2 Validation questions; §20 Phase 0 + Gate 0 evidence threshold; §22 budget; §15 testing model; §24 Discovery acceptance

## The point of Phase 0

Phase 0 is not a build phase with a demo at the end. It exists to answer whether a CA$5M platform should be built at all, using **paid** engagements rather than stated intent. Per §25, "Overbuilding before validation" is a named risk with capital loss as its impact.

The discipline that makes this work: **Phase 0 delivers real assessments to real paying clients using manual, concierge operations.** The prototype supports the sale and the research; humans do the delivery. Nothing built in Phase 0 is production platform code, and nothing built in Phase 0 is thrown away either — the content model, qualifier rules and design tokens carry forward into CC-01.

## Gate 0 thresholds (PRD §20 verbatim intent)

| # | Threshold | Measured how | Status |
|---|---|---|---|
| G0-1 | ≥20 paid readiness assessments across ≥3 target verticals | Payment records; vertical tagged at intake | Not started |
| G0-2 | ≥5 upgrades from assessment to a core package | Signed scopes | Not started |
| G0-3 | ≥25% conversion from qualified human conversation to paid assessment | Call log → payment, cohort-based | Not started |
| G0-4 | Observed contractor capacity for the first 50 engagements + calibrated wholesale rate card | Contractor availability declarations + calibration assignment results | Not started |
| G0-5 | Credible path to ≥55% blended gross margin without underpaying specialists or lowering QA | Delivered-engagement cost model, actuals not estimates | Not started |
| G0-6 | No unresolved legal, ethical, accessibility or security issue that invalidates positioning or delivery | Counsel review, panel findings, security review — each with a named sign-off | Not started |

**Gate 0 is failed, not deferred, if G0-5 requires underpaying contractors or cutting QA.** That is stated in the PRD and should be restated to the steering committee, because it is the threshold most likely to be quietly negotiated.

## What gets built (and what deliberately does not)

### Built — the validation prototype

A single deployable prototype, EN-only content on a bilingual-capable model (Q-18), no authenticated portal.

| # | Artefact | Purpose | Carries forward to |
|---|---|---|---|
| P0-1 | Public landing experience: notice band, hero, employee-band selector, offer architecture, method, trust layer | Test whether the positioning converts (§7 modules, §23 positioning) | CC-02 |
| P0-2 | Readiness qualifier, 6–10 questions, server-side rules, save-and-resume, explainable result | The core conversion hypothesis and the §2 validation questions | CC-02 (rules reused) |
| P0-3 | Booking + payment for the CA$495 assessment | Tests willingness to pay, not stated intent | CC-03 (flow validated, rebuilt) |
| P0-4 | Regulatory-claim content model with source, effective date, reviewer, next-review date | Proves the ENG-007/CNT-001 model before it is load-bearing | CC-01 |
| P0-5 | Design tokens + ~8 accessible primitives (button, field, radio group, progress, disclosure, dialog, notice, link) | Design-system alpha; the panel tests these, not mockups | CC-01 |
| P0-6 | Assessment deliverable template — accessible HTML + manually tagged PDF | Tests whether the *output* is what buyers will pay for, and exposes the PDF/UA problem early (Q-22) | CC-05 |

### Not built in Phase 0

Client portal, contractor portal, internal console, evidence vault, file pipeline, AI anything, French content, CRM integration, e-signature. Delivery runs on scheduled calls, email, a shared drive with access controls, and a spreadsheet cost model. If that feels uncomfortably manual, that is the correct amount of discomfort for a pre-Gate-0 business.

**Explicit constraint:** because there is no evidence vault, Phase 0 must not accept sensitive client evidence into ad-hoc tooling without a written handling procedure. Client files during Phase 0 go to an access-controlled, Canadian-region shared drive with a named owner, a retention date and a deletion step at engagement close. This procedure is itself a Gate 0 artefact (G0-6).

## Six-week schedule

| Week | Research & demand | Prototype | Delivery & network | Governance |
|---|---|---|---|---|
| 1 | Recruit disability panel (ACC-010, ORG-001); begin 100-contact outreach list | Tokens + primitives (P0-5); content model (P0-4) | Contractor sourcing brief; insurance quotes (ORG-006) | Counsel engaged on claim wording (Q-04); PIA scoping |
| 2 | First 25 decision-maker conversations | Landing + qualifier v1 (P0-1, P0-2) | 3–5 contractor candidates in verification | Residency decision (Q-17); ADR approvals |
| 3 | Panel session 1 on qualifier + primitives (discovery-stage, paid) | Fix panel findings; payment flow (P0-3) | Paid calibration assignments issued | Regulatory claim set reviewed two-person (§20) |
| 4 | Open paid assessments; 25 more conversations | Deliverable template (P0-6) | First assessments delivered manually | Cost actuals captured per engagement |
| 5 | Push to 20 paid assessments; upgrade conversations | Panel session 2 on the deliverable | Rate card calibrated from actuals | Security review of Phase 0 handling procedure |
| 6 | Close cohort; conversion + margin analysis | Freeze; write findings into `/docs` | Capacity model for 50 engagements | **Gate 0 pack assembled and reviewed** |

## Research protocol

- **100 decision-maker interviews/contacts** (§20). Structured guide covering the four §2 validation questions. Record: sector, employee band, current readiness activity, whether they knew the deadline, what they'd pay, and — critically — whether they'd self-serve the free official route.
- **Paid disability panel**, recruited week 1, compensated, with accessible research materials and choice of format (ACC-010, §4). Two sessions minimum in Phase 0: qualifier/primitives (week 3) and deliverable (week 5). Blind/low-vision, keyboard-only, Deaf/HoH, mobility, neurodivergent and cognitive/learning participants per §4.
- **Contractor calibration**: every candidate completes one *paid* calibration assignment before any live client work (§10 network admission). Calibration outputs are scored against the rubric that becomes CTR-005.
- **Ethics:** no fear-based outreach, no fabricated personalization, easy opt-out, anti-spam review (§23).

## Measurement

Instrument the prototype with the §19 taxonomy from day one — `source_viewed`, `employee_band_selected`, `qualifier_started/answered/completed`, `result_viewed`, `official_source_opened`, `assessment_selected`, `booking_started`, `purchase_completed` — under ADR-0007's consent rules. `official_source_opened` is the single most informative event in Phase 0: it measures buyers choosing the free route, which is the core commercial hypothesis.

Report weekly: qualifier completion rate (target ≥45%, §19), qualified-conversation→paid rate (target ≥25%), consent rate alongside every funnel number, and cost-to-deliver actuals per engagement.

## Phase 0 budget allocation (within CA$250k)

Indicative, for steering-committee approval; the PRD sets the CA$250k envelope but not its split.

| Line | Indicative | Notes |
|---|---|---|
| Research, interviews and disability panel (compensated) | $55,000 | Panel compensation is non-negotiable (§4) |
| Prototype design + build | $70,000 | Tokens, primitives, qualifier, payment, deliverable template |
| Contractor calibration (paid assignments) + sourcing | $40,000 | Paid calibration is a §10 admission requirement |
| Delivery of the 20 assessments (specialist time) | $35,000 | Real cost of the concierge motion; feeds G0-5 |
| Legal, privacy and insurance | $30,000 | Counsel on claims (Q-04), PIA scoping, insurance (ORG-006) |
| Brand, content and photography (minimum viable) | $15,000 | Enough to test premium positioning honestly |
| Contingency | $5,000 | Steering-committee release only |

## Gate 0 decision pack

Assembled week 6, presented to the steering committee, containing:

1. Threshold table G0-1..G0-6 with evidence links and pass/fail per row.
2. Conversion funnel with consent rate stated.
3. Cost-to-deliver actuals and the derived rate card; blended margin with the arithmetic shown.
4. Contractor capacity model for 50 engagements.
5. Panel findings and their disposition (fixed / deferred / accepted with rationale).
6. Counsel position on regulatory claims and marketing wording.
7. Updated [assumptions register](./assumptions-register.md) with Q-04..Q-08 answered.
8. **A written recommendation including the stop case** — what evidence would justify not proceeding, stated by the team that wants to proceed.

## Success criteria for this plan itself

Phase 0 has succeeded as a *process* if, at week 6, the steering committee can make the CA$1.50M decision from evidence rather than from enthusiasm — including a clean "no". A Phase 0 that produces only encouraging signals and no disconfirming ones has not been run honestly.
