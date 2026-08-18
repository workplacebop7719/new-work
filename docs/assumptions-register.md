# Assumptions and open-questions register

**Status:** Draft for approval. **Source:** [`/docs/PRD.md`](./PRD.md) v1.0.
**Rule (PRD §27):** Claude Code may propose an ADR where a decision is missing; it may not silently weaken a requirement. Every assumption below is recorded rather than absorbed.

Two lists follow. **Section A** is questions that must be answered by a human — some block work, some do not. **Section B** is assumptions Claude Code is proceeding on unless corrected; each is a place where the build could be wrong without anyone noticing.

Severity key: **B0** blocks CC-01 scaffolding · **B1** blocks the named slice · **B2** needed before public launch · **B3** monitor.

## Section A — Open questions

### A1. Governance and requirement identity

| # | Question | PRD basis | Severity | Owner | Needed by |
|---|---|---|---|---|---|
| Q-01 | Do you accept the derived requirement-ID namespaces (CLP, OPS, AIG, CNT, BRD, ACC, SEC, ARC, DAT, ANL, QAG, ENG, CMD, ORG) added in [traceability.md](./traceability.md) §2? The PRD only issues PUB, CNV and CTR IDs, so most of the portal, security and accessibility obligations have nothing to cite in a PR. | §7, §8, §10 issue IDs; §9, §11–§19 do not | **B0** | Product lead | Approval |
| Q-02 | Who are the named holders of the three stop-ship authorities (accessibility, privacy, security)? Release gates in CC-05/CC-09 need a real identity, not a role label. | §20 Governance | **B1** (CC-05) | Steering committee | CC-01 |
| Q-03 | Is the PRD's own review cadence defined? §26 says regulatory statements were reviewed 2026-08-18 and must be revalidated before publication — but the PRD does not name its own next-review date. | §26 source status | B2 | AODA specialist | CC-02 |

### A2. Regulatory and commercial

| # | Question | PRD basis | Severity | Owner | Needed by |
|---|---|---|---|---|---|
| Q-04 | Has counsel reviewed the December 31, 2026 deadline statement and the WCAG 2.0-vs-2.2 framing that the homepage notice band will display? The PRD forbids hard-coded regulatory claims but the *first* content object still needs a legally reviewed value. | §2, §7 PUB-004, §26 | **B1** (CC-02) | AODA specialist + counsel | Phase 0 exit |
| Q-05 | The 2026 reporting deadline is ~4 months after this PRD's date, but Phase 2 (public + client MVP) lands months 4–7. **The platform's stated acquisition catalyst expires before the MVP ships.** Is the Phase 0/1 manual-concierge motion intended to carry all 2026-deadline revenue, or should the roadmap be re-sequenced? | §2 vs §20 timing | **B0** | Steering committee | Approval |
| Q-06 | Is CA$495 the tested price or a hypothesis to be A/B tested during Phase 0? §5 says "launch hypotheses"; §8 says the qualifier shows "transparent CA$495 price". If it is variable, the qualifier result must render it from configuration, not copy. | §5, §8 | B1 (CC-02) | Founder / growth | CC-02 |
| Q-07 | What is the wholesale rate card that makes ≥55% blended gross margin true? Without it, the scope builder (OPS-004) and margin-leak alerts (OPS-013) have no reference values. | §5, §11, §20 | B1 (CC-07) | COO | CC-06 |
| Q-08 | Which contractor payment rails and terms apply (CTR-006 invoice status, payment date)? Accounting sync is named but not the system of record. | §10, §17 | B1 (CC-06) | COO / finance | CC-06 |

### A3. Technical decisions the PRD deliberately leaves open

The PRD is vendor-neutral by design (§17). Each of these is answered by a **proposed ADR** in [`/docs/adr`](./adr/); the question here is whether you accept the proposal.

| # | Question | Proposed answer | Severity | Owner |
|---|---|---|---|---|
| Q-09 | Framework, package manager and monorepo tooling? | [ADR-0001](./adr/0001-stack-and-monorepo.md) | **B0** | Engineering lead |
| Q-10 | Identity provider — managed IdP vs. self-hosted, and which one meets accessible-MFA and phishing-resistant requirements? | [ADR-0002](./adr/0002-identity-and-access.md) | **B0** | Engineering + security |
| Q-11 | Tenancy model — shared schema with RLS vs. schema-per-tenant vs. database-per-tenant? | [ADR-0003](./adr/0003-tenancy-and-data-isolation.md) | **B0** | Engineering lead |
| Q-12 | File pipeline — storage vendor, malware scanner, quarantine topology, signed-URL lifetime? | [ADR-0004](./adr/0004-file-pipeline-and-evidence.md) | B1 (CC-04) | Engineering + security |
| Q-13 | CMS — which headless CMS provides bilingual workflow, scheduled review and version history without an accessibility blocker in its authoring UI? | [ADR-0005](./adr/0005-content-platform.md) | **B0** (content model shapes CC-01) | Design + engineering |
| Q-14 | Integration set — CRM, payments, calendar, e-signature, email/SMS, support, accounting vendors? | [ADR-0006](./adr/0006-integration-architecture.md) | B1 (CC-03) | COO + engineering |
| Q-15 | Analytics — which product analytics tool can run consent-gated, PII-aware, with Canadian data residency? | [ADR-0007](./adr/0007-analytics-and-consent.md) | B1 (CC-02) | Product + privacy |
| Q-16 | AI provider and governance mechanics — enterprise no-training terms, region, provenance store? | [ADR-0008](./adr/0008-ai-governance.md) | B1 (CC-08) | Product + security |

### A4. Requirements that appear to conflict or need a tie-breaker

| # | Tension | PRD basis | Proposed resolution | Severity |
|---|---|---|---|---|
| Q-17 | **Data residency vs. vendor availability.** §16 requires a data-residency review and §17 asks for Canadian-region-capable storage, but the preferred managed IdP, CMS, CRM and AI providers may not all offer Canadian regions. Which requirement yields? | §16 Data protection, §17 Files | Storage and database: Canadian region mandatory. Everything else: Canadian region preferred, US acceptable only with documented PIA, contractual safeguards and a client-visible subprocessor entry. Needs privacy-lead sign-off. | **B0** |
| Q-18 | **Bilingual from day one vs. Phase 0 speed.** §1 says build bilingual capability from day one; §20 Phase 0 is six weeks of paid validation. Does the Phase 0 prototype ship FR, or only the *architecture* that admits FR? | §1, §13, §20 | Phase 0 prototype is EN-only with the content model, routing and translation-state fields fully bilingual, so no rework is needed. FR content ships in CC-02. | B1 (CC-02) |
| Q-19 | **E-signature accessibility.** §9 requires e-signature; §17 requires it "subject to accessibility review and an equivalent supported process". No mainstream e-sign vendor is a safe assumption for PUB-003/ACC-009 parity. | §9, §17, §27 ("replace rather than patch over") | Budget for an in-product signing flow if vendor review fails. Decide during CC-03, not CC-07. | B1 (CC-03) |
| Q-20 | **Care plan is listed as Phase 4 but is a §5 launch offer.** The public site may market a Care Plan (CA$399–799/mo) months before CLP-011 exists. | §5, §9, §20 | Either delay the Care Plan offer on the public site or deliver it as a manual concierge service with an explicit "delivered by our team" description. Growth decision. | B2 |
| Q-21 | **"No automated conclusion" vs. qualifier result.** CNV-002 requires an explainable result; §8 requires uncertain cases to reach a human with no automated conclusion. The boundary between "routing category" and "conclusion" needs a written rule the content team can apply. | §8, §12 | Draft rule: the qualifier may state *what is likely in scope* and *what to do next*; it may never state whether an obligation is met, or use "compliant", "non-compliant", "pass" or "fail". Needs AODA specialist sign-off. | B1 (CC-02) |
| Q-22 | **Report PDF accessibility.** ACC-008 requires tagged PDFs; no HTML-to-PDF pipeline produces reliable PDF/UA tagging without significant investment. Cheap renderers will fail the launch blocker (ACC-013). | §9, §15, §27 | Treat accessible PDF generation as its own engineering workstream inside CC-05 with a manual PDF/UA verification step, and make accessible HTML the primary deliverable format. | B1 (CC-05) |
| Q-23 | **Availability objective vs. team size.** §16 sets 99.95% availability and 24/7 critical escalation; §21 staffs a small core team with fractional security. 99.95% is ~22 minutes of downtime per month. | §16, §21 | Either fund an on-call rotation/managed SRE, or restate the objective as a target with published maintenance windows. Executive decision. | B2 |

## Section B — Working assumptions

Each is what Claude Code will do absent a correction. Numbered for citation in PR descriptions.

### Product and scope

| # | Assumption | If wrong |
|---|---|---|
| A-01 | "Ontario-only" applies to the *content and requirements library*, not to the software architecture; jurisdiction is a first-class field from CC-01 so other provinces need no migration. | Cheaper now, migration later. |
| A-02 | The qualifier is 6–10 questions, single-page-per-question with a progress indicator, and its rules run **server-side** so the rule version is auditable and the result reproducible. | Client-side rules would break CNV-002 auditability. |
| A-03 | Employee bands are exactly `<20`, `20–49`, `50–199`, `200+` (§7) and are stored as an enum, not a raw number, to reduce collected data. | Some routing may need exact counts. |
| A-04 | "Readiness assessment" is a fixed-scope product with a template project; not a bespoke engagement builder in MVP. | Scope builder (OPS-004) would need to reach CC-03. |
| A-05 | Public site and portals are one deployment with route groups (§27 repo shape), not separate apps. | Splitting later is a build-config change, not a rewrite. |

### Accessibility

| # | Assumption | If wrong |
|---|---|---|
| A-06 | "Agreed supported versions" for screen readers (§15) means the two most recent major versions of each AT/browser pair at the start of each slice, recorded in the a11y test plan. | Wider support widens manual test cost significantly. |
| A-07 | Automated axe checks run on every PR against every page and every Storybook story; they gate merge but never close an accessibility item (ENG-005). | — |
| A-08 | The disability panel is recruited and contracted during Phase 0, since ACC-010 requires panel sessions at *discovery* — before any code exists. | Panel sessions slip and Gate 0 evidence is incomplete. |
| A-09 | Design-system components are built in-house on unstyled accessible primitives; no component library is adopted whose keyboard/SR behaviour we cannot modify (§27: replace, don't patch). | Faster with a library, but §27 forbids patching over defects. |

### Security, privacy and data

| # | Assumption | If wrong |
|---|---|---|
| A-10 | Tenant identifiers exposed in URLs are opaque ULIDs/UUIDv7, never sequential (ENG-003). | — |
| A-11 | Audit events (SEC-006) are written in the same transaction as the action they record, to an append-only table with no application-level UPDATE/DELETE grant. | Weaker tamper-evidence. |
| A-12 | "Immutable" audit logs means append-only plus periodic export to write-once storage — not blockchain-style hashing — unless assurance review asks for hash chaining. | Cost and complexity. |
| A-13 | Malware scanning is asynchronous: upload lands in quarantine, is unavailable for preview/download until scan passes, and the client sees an explicit scanning state. | Synchronous scanning harms upload UX and INP. |
| A-14 | Retention schedules are configured per data class in code-reviewed config, and the retention job is dry-runnable and logged before it deletes anything. | Irreversible deletion risk. |
| A-15 | Abandoned qualifier data (CNV-001) is retained 30 days by default. **The PRD says "short" without a number.** | Privacy lead may set a different figure. |
| A-16 | Contractor access expiry (CTR-004) is enforced by a scheduled revocation job *and* a check at every request, so a missed job cannot leave access open. | — |
| A-17 | Break-glass admin access (DAT-005) defaults to a 4-hour window with mandatory reason capture and an alert to the security lead. | — |

### Engineering and delivery

| # | Assumption | If wrong |
|---|---|---|
| A-18 | The command contract (CMD-001) is implemented as package.json scripts at the repo root, delegating to the monorepo task runner; CI runs each one. | — |
| A-19 | `db:reset-safe` refuses to run when the target database URL is not recognized as a non-production environment, and this refusal is tested. | Production data loss. |
| A-20 | Every slice ends with a PR using the §27 evidence template, and traceability.md is updated in that same PR. | Traceability drifts. |
| A-21 | Preview environments seed the Maple Grove demo tenant (CMD-003) and never contain client data. | — |
| A-22 | "No production migration without rollback notes" (ENG-006) is enforced by a CI check that fails when a migration file has no paired notes file, not by reviewer memory. | Relies on discipline. |
| A-23 | Feature flags gate every incomplete slice so `main` stays deployable; flags are removed when the slice closes. | Long-lived branches instead. |

### AI

| # | Assumption | If wrong |
|---|---|---|
| A-24 | No AI is used anywhere in CC-01 through CC-07. AI capabilities are introduced only in CC-08, behind the capability registry (AIG-001). | Earlier AI use would need the full governance stack early. |
| A-25 | The "AI not used" workflow (AIG-004) is an organization-level setting *and* a per-document override, with the stricter of the two winning. | — |
| A-26 | Redaction (AIG-005) is verified by golden-file tests over synthetic documents containing seeded identifiers; a redaction miss fails CI. | Leakage risk. |

## Section C — PRD assumptions inherited unchallenged

The PRD's own assumptions register (§25) lists five. Claude Code adopts them as stated but flags the two that the *product* can help test rather than assume:

- **Willingness to pay for confidence over free filing resources** — testable in Phase 0 and the reason Gate 0 exists; the qualifier's `official_source_opened` event (ANL-001) is a direct measurement of buyers self-serving instead of purchasing. Instrument it from day one.
- **Bilingual capability materially improves credibility** — measurable via language drop-off in the §19 activation metric. Phase 0 cannot test this if the prototype is EN-only (see Q-18); accept that this assumption stays unvalidated until CC-02.

The remaining three (specialist network capacity, WCAG 2.2 AA as product target, insurance availability) are organizational and sit with the COO and accessibility lead (ORG-002, ORG-006).
