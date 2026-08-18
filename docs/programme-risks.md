# Risks that could invalidate the CA$5M programme

- **Status:** Draft for approval — for the steering committee (PRD §20 Governance)
- **Scope:** This document is deliberately narrower and harsher than the PRD's own risk register (§25). §25 lists risks to *delivery*. This lists risks to the **premise** — conditions under which spending CA$5,000,000 is the wrong decision even if the platform is built exactly as specified.
- **Companion:** [assumptions register](./assumptions-register.md) · [Phase 0 plan](./phase-0-validation-plan.md) · [delivery plan](./delivery-plan.md)

Each risk carries a **kill criterion**: an observable condition that should stop or re-scope the programme rather than trigger a mitigation. The PRD's gate structure only works if someone is willing to act on these.

---

## R-01 — The acquisition catalyst expires before the product ships

**Severity: highest. This is the risk most likely to invalidate the programme as scheduled.**

The PRD is dated **August 18, 2026**. The reporting deadline it uses as its acquisition catalyst is **December 31, 2026** — roughly 19 weeks later. The roadmap (§20) puts Phase 0 at weeks 1–6, Phase 1 at weeks 7–14, and the **public + client MVP at months 4–7**.

On that schedule, the marketing site and client portal reach controlled beta somewhere around December 2026 to March 2027 — at or after the deadline that §2 identifies as the reason buyers act now. Phase 5 launch lands months 12–15, well into 2027.

The programme therefore spends its first CA$1.75M building demand infrastructure for an urgency window that closes before the infrastructure exists.

| Aspect | Detail |
|---|---|
| Early indicator | Already present in the document itself — no mitigation is needed to detect this; the dates are on the page. |
| Consequence if ignored | Phase 2 launches into a post-deadline market with a positioning built on a passed deadline, and Gate 0 evidence (collected in a pre-deadline panic) systematically overstates steady-state demand. |
| **Kill criterion** | If Gate 0 conversion evidence cannot be reproduced in a **post-deadline cohort** (a second cohort measured after December 31, 2026 with materially similar conversion), the CA$3.25M Phase 2 release should not proceed on the original thesis. |
| Recommended action | Two changes. (1) Re-sequence: pull the public conversion surface (CC-02) and commerce (CC-03) forward, deliver client delivery concierge-style for longer, and defer the portal-heavy slices. (2) Require Gate 0 to include an explicit **post-deadline demand hypothesis** with evidence, not an assertion. |
| Open question | Q-05 |

---

## R-02 — Post-deadline demand collapse

§25 names this ("2026 urgency collapse") and mitigates it with care plans, remediation, procurement content and multi-jurisdiction expansion. Those mitigations are real but they are all **Phase 4** work (months 9–12) — the recurring-revenue product arrives a year after the deadline that funds the acquisition.

The programme's durable thesis (§2: "the durable business is broader than a deadline") is asserted, not evidenced. Phase 0 as specified measures deadline-driven demand almost exclusively, because that is the only demand available in weeks 1–6 of a pre-deadline autumn.

| Aspect | Detail |
|---|---|
| Early indicator | Traffic and conversions concentrated on deadline pages; qualifier results skewing to "readiness assessment fit" driven by reporting status rather than by website/document gaps. |
| **Kill criterion** | If ≥80% of Phase 0 paid assessments cite the reporting deadline as the primary purchase driver, the CA$5M thesis is a deadline business, not a readiness business, and the envelope should be cut to match a shorter revenue window. |
| Recommended action | Add a Phase 0 research question that separates deadline-driven from gap-driven purchase motivation, and report the split in the Gate 0 pack. Consider pulling Care Plan (CLP-011) earlier if the recurring thesis is what the CA$5M actually rests on. |

---

## R-03 — The revenue arithmetic does not obviously support a CA$5M platform

Using the PRD's own numbers and no external data:

- Offer ladder (§5): assessment CA$495; core CA$2,000–3,000; digital CA$4,500–7,500; care plan CA$399–799/mo.
- Conversion targets (§19): ≥25% qualified-call→paid assessment; ≥50% assessment→core.
- Margin target (§5, §19): ≥55% blended gross.

Expected revenue per assessment client, taking midpoints and the PRD's own conversion targets: `$495 + (0.5 × $2,500) + (an optimistic 0.2 × $6,000) ≈ $2,945`. At 55% gross margin that is roughly **$1,620 of gross profit per assessment client**.

Recovering the CA$5,000,000 programme envelope in gross profit therefore implies on the order of **3,000 assessment clients**; recovering it in revenue implies roughly **1,700**. Both figures are before overhead, sales cost and churn, and both assume the conversion targets are hit rather than aspired to.

The beachhead is Ontario organizations with 50–199 employees, initially across four verticals (§2). **Whether that segment contains enough addressable organizations for a four-figure client count at these prices is not established anywhere in the PRD, and it is the single arithmetic question the CA$5M decision rests on.** (Segment-size figures are deliberately not estimated here — this needs a sourced market-sizing exercise, not a plausible-sounding number.)

| Aspect | Detail |
|---|---|
| Early indicator | No market-sizing artefact exists in the PRD; §22 justifies the budget by *investment areas*, never by a path to return. |
| **Kill criterion** | If a sourced market-sizing exercise shows the beachhead cannot plausibly yield the implied client count within the payback horizon the steering committee sets, the envelope should be reduced before Phase 1, not after Phase 4. |
| Recommended action | Require, as a Gate 0 artefact, (a) a sourced addressable-market estimate for the beachhead, (b) a stated payback horizon, and (c) the price/volume combination that closes the gap — noting that this may mean the real business is higher-priced remediation management and care plans, not CA$495 assessments. |

---

## R-04 — The core offer competes with a free, official alternative

§2 states plainly that government reporting support and forms are available without a private intermediary, and §8 requires the qualifier to hand "likely self-serve" visitors relevant official links and a plain-language checklist with no aggressive follow-up.

This is the right ethical posture and it is also a structural commercial exposure: the product is designed to route some of its own traffic to the free alternative, and the differentiation ("evidence review, gap closure, audit, prioritization, sign-off preparation") is a *service* claim that a website cannot demonstrate before purchase.

| Aspect | Detail |
|---|---|
| Early indicator | High `official_source_opened` relative to `assessment_selected` (ADR-0007 instruments exactly this); prospects asking only about form filing (§25). |
| **Kill criterion** | If, in the Phase 0 cohort, qualified conversations convert below the 25% Gate 0 threshold *and* the dominant stated reason is "we can do this ourselves with the official resources", the premium positioning has failed its test — proceed only with a revised offer, not a revised funnel. |
| Recommended action | Keep `official_source_opened` on the Gate 0 dashboard as a headline metric rather than a diagnostic one. Resist the temptation to de-emphasize the free route; doing so would violate CNV-003 and §3, and would also hide the signal. |

---

## R-05 — Specialist supply is the real capacity constraint

The delivery model depends on IAAP-certified or equivalently experienced manual auditors, Ontario accessibility consultants, accessible-document specialists and remediation developers, all verified, insured, calibrated through a *paid* assignment, and available at wholesale rates compatible with ≥55% blended margin (§5, §10).

Gate 0 requires "observed contractor capacity for the first 50 engagements". Fifty is the easy number. The R-03 arithmetic implies a steady state one to two orders of magnitude larger, drawn from a specialist pool that is small in Ontario and is being recruited by every organization facing the same deadline.

| Aspect | Detail |
|---|---|
| Early indicator | Calibration assignments taking longer than planned to source; wholesale rates quoted above the rate card; low first-pass acceptance in calibration. |
| **Kill criterion** | If the calibrated wholesale rate card cannot deliver ≥55% blended margin without underpaying specialists or reducing QA, **Gate 0 has failed** — this is already the PRD's own wording (§20) and should not be renegotiated into a "path to margin". |
| Recommended action | Model capacity at 10× the Gate 0 volume during Phase 0, not at 50 engagements. Treat contractor recruitment as a permanent funded function (§21 contractor success manager), and price the offer ladder from the rate card upward rather than from a market assumption downward. |

---

## R-06 — The product's own accessibility standard is a schedule and cost risk the budget may understate

The programme commits to WCAG 2.2 AA across the public site, both portals **and generated client artefacts**, with a hard launch blocker of zero open severity-1 defects (ACC-013), an independent third-party audit (ACC-011), a paid disability panel at four stages (ACC-010), tagged PDF deliverables (ACC-008), and a standing instruction to **replace** any third-party component that blocks accessibility rather than patch it (§27).

That last instruction is the expensive one. Payment, e-signature, scheduling and CMS authoring UIs are all plausible failure points, and "replace" can mean building a checkout, a signing flow, or a scheduling interface in-house. Accessible tagged-PDF generation (Q-22) is a known-hard engineering problem with no cheap solution.

This is not an argument to weaken the standard — the standard *is* the product's credibility, and a platform selling accessibility readiness cannot ship an inaccessible portal. It is an argument that CA$500,000 for "accessibility + lived-experience co-design" (§22) may be sized for testing and panel work rather than for replacement builds.

| Aspect | Detail |
|---|---|
| Early indicator | First vendor accessibility evaluation failing (likely candidates: e-signature, CMS authoring UI, payment elements); PDF/UA verification failing at CC-05. |
| **Kill criterion** | Not a kill risk for the programme — it is a **budget-adequacy** risk. But if the launch blocker (ACC-013) is proposed for relaxation to hold a date, that proposal is itself the signal that the programme has lost its differentiator, and the steering committee should treat it as a stop-ship rather than a trade-off. |
| Recommended action | Reserve an explicit contingency line inside the accessibility budget for component replacement. Run vendor accessibility evaluations during **Phase 0**, before contracts are signed and before Q-19/Q-22 become schedule emergencies. |

---

## R-07 — A single regulatory misstatement can end the business

The product's entire value proposition is that its statements are trustworthy. A published claim that is wrong, stale, or reads as legal advice creates client harm, liability and — most damagingly — destroys the one asset that justifies premium pricing (§25 "Regulatory misstatement").

The PRD's controls are strong (ENG-007, ENG-008, CNT-005 automatic hold, two-person review with source and effective-date capture, counsel escalation). ADR-0005 makes them machine-enforced rather than procedural. The residual risk is not technical: it is that a fractional AODA specialist (§21) is a single point of failure for every regulatory claim, every requirements-library update, and every high-risk review.

| Aspect | Detail |
|---|---|
| Early indicator | Claim review dates slipping; the specialist becoming a queue; content shipped with a single reviewer because the second was unavailable. |
| **Kill criterion** | Not a kill criterion but a **stop-ship**: if two-person review (§20) cannot be staffed, regulatory content does not publish. Building a second reviewer relationship is a Phase 0 deliverable, not a Phase 3 nicety. |
| Recommended action | Contract two independent qualified reviewers before CC-02. Track claim-review SLA as an operational metric on the risk dashboard (OPS-008). |

---

## R-08 — The operating model is thin for what is being promised

§16 commits to 99.95% portal availability (≈22 minutes of downtime per month), RTO ≤4 hours, RPO ≤15 minutes and 24/7 critical incident escalation. §21 staffs a small core team with a **fractional** security/privacy lead and a fractional AODA specialist.

Simultaneously the platform is four products (public site, client portal, contractor portal, internal console), bilingual, with seven roles, nine core entities, an evidence pipeline, a job system, eight integrations and an AI governance stack.

| Aspect | Detail |
|---|---|
| Early indicator | Slices consistently overrunning; the same person appearing as accountable in three §21 rows; on-call unstaffed at CC-09. |
| **Kill criterion** | Not a kill criterion. It is a **scope-honesty** issue: if the team cannot be staffed to the §16 objectives, the objectives should be restated publicly (with maintenance windows) rather than published and missed — a missed availability commitment in the contract is a commercial liability. |
| Recommended action | Resolve Q-23 before any availability figure appears in a client agreement or on the public site. Fund on-call or a managed SRE arrangement as an explicit line before CC-09. |

---

## R-09 — Bilingual capability is committed from day one and its cost compounds

§1 requires bilingual capability from day one specifically to avoid later rework, and §13 requires per-page translation status, translator/reviewer identity and sync state. Every page, every notification template, every report template, every error message and every regulatory claim is authored twice and reviewed twice — and regulatory claims must be *translated by a qualified reviewer*, never machine-translated (ADR-0005).

The PRD lists this among its own assumptions (§25: bilingual "materially improves credibility ... despite higher initial cost") without evidence, and Phase 0 as scoped cannot test it (Q-18).

| Aspect | Detail |
|---|---|
| Early indicator | FR content lagging EN by more than one release; translation review becoming a release blocker; FR traffic negligible in CC-02. |
| **Kill criterion** | None — this is a strategic and arguably an ethical commitment for an Ontario accessibility business, not purely a commercial one. But if FR demand proves negligible through CC-02, the decision to be re-examined is the *content volume* in FR, never the architectural bilingual capability. |
| Recommended action | Keep the bilingual **architecture** unconditional (it is cheap now and expensive later); make FR **content depth** a reviewable investment decision at CC-02 with measured evidence. |

---

## R-10 — Data residency may be unsatisfiable across the vendor set

§16 requires a data-residency review and §17 asks for Canadian-region-capable object storage. The platform needs an IdP, a CMS, a CRM, a payment processor, a scheduler, an e-signature vendor, an email/SMS provider, a support desk, an accounting system, an analytics destination, a malware scanner and an AI provider. It is unlikely that all offer Canadian regions on acceptable terms.

| Aspect | Detail |
|---|---|
| Early indicator | Vendor shortlists narrowing to one option per category during Phase 0. |
| **Kill criterion** | None at the programme level, but an unresolved residency posture blocks CC-01 (Q-17 is severity B0), because tenancy, storage and identity decisions all depend on it. |
| Recommended action | Adopt the ADR proposal: Canadian region **mandatory** for the database and evidence storage; elsewhere, documented PIA, contractual safeguards and a client-visible subprocessor entry. Get privacy-lead sign-off before CC-01, and publish the subprocessor register as a trust asset (§7 trust layer) rather than hiding it. |

---

## R-11 — Much of the portal is generic project tooling that clients may not adopt

The client portal reproduces capabilities clients already have elsewhere: tasks, milestones, comments, approvals, file storage, notifications. Its differentiator is the *accessibility-specific* spine — requirements matrix, evidence-to-finding traceability, retest history, controlled release.

The risk is building a mediocre project-management tool alongside an excellent readiness system, and having clients keep their work in email and a shared drive anyway — which would strand a large part of the CA$1,050,000 portal budget.

| Aspect | Detail |
|---|---|
| Early indicator | Beta clients using the portal only to download reports; low `evidence_uploaded` relative to engagements; PMs re-entering client email content by hand. |
| **Kill criterion** | If controlled-beta clients complete engagements without meaningful portal use, cut CLP-007 (work plan) and reduce the portal to its differentiated spine — evidence, matrix, findings, reports, release — before spending Phase 3 money on it. |
| Recommended action | Instrument portal adoption per capability from CC-04 and review it at the Phase 2 quality gate. |

---

## R-12 — Non-technical prerequisites can block launch regardless of engineering

Three organizational items sit outside the build but can stop it:

| Item | PRD basis | Risk |
|---|---|---|
| Trademark, domain, language and cultural clearance for "Project Northstar" | §26 ("not trademark-cleared") | Brand work and public content are built on an unowned name; a late rebrand hits every page, template, report and integration record. |
| Professional, cyber and general liability insurance at sustainable cost | §25 assumption | Contractors cannot be admitted (§10) and clients will not sign without it. |
| Counsel sign-off on regulatory claims and marketing wording | §26 disclaimers | PUB-004 cannot ship without it. |

**Kill criterion:** none individually, but all three must be resolved during Phase 0. Any one unresolved at Gate 0 should count against G0-6 ("no unresolved legal, ethical, accessibility or security issue"), not be waived as administrative.

---

## Summary — the three that should shape the Gate 0 conversation

1. **R-01 / R-02 — timing.** The catalyst expires before the platform ships. Everything else is downstream of whether the post-deadline business is real. Gate 0 must produce evidence about post-deadline demand, not just pre-deadline conversion.
2. **R-03 — arithmetic.** No document in the programme connects CA$5,000,000 to a client count the beachhead can supply at these prices. That connection should exist before the CA$1.50M Phase 1 release, not after.
3. **R-05 — supply.** The margin target and the entire delivery model rest on a specialist pool whose availability at the required rate is untested beyond 50 engagements. The PRD already makes this a Gate 0 failure condition; it should be enforced as written.

None of these is an argument against building the platform. Each is an argument for the PRD's own core decision — stage the capital, and be willing to act on a gate that fails.
