# Incremental delivery plan — CC-01 through CC-09

- **Status:** Draft for approval. No application code exists yet.
- **PRD basis:** §27 Claude Code delivery sequence, Build mode, Environment and command contract; §20 Roadmap and release gates
- **Companion documents:** [traceability](./traceability.md) · [assumptions](./assumptions-register.md) · [ADRs](./adr/) · [Phase 0](./phase-0-validation-plan.md) · [programme risks](./programme-risks.md)

## Rules that apply to every slice

Per PRD §27 "Build mode":

1. **Vertical slices only.** Each crosses interface, authorization, data, audit logging, analytics, tests and documentation. No slice is "the UI for X"; no slice is "the backend for X".
2. **Slice opens with a restatement**: requirement IDs, assumptions in play, data-migration impact, accessibility risks, security threats.
3. **Slice closes with evidence**: required checks run, evidence summarized, remaining risks listed, `traceability.md` updated *in the same PR*.
4. **Replace, don't patch.** A third-party component that blocks keyboard, screen-reader, zoom, localization, privacy or performance requirements is replaced (§27).
5. **Definition of done** (§24) applies per PR, using the §27 evidence template.
6. **No slice starts before Gate 0 passes.** CC-01 begins in Phase 1 (weeks 7–14), not during validation.

### Gates mapped to slices (PRD §20)

| PRD phase | Slices | Capital position |
|---|---|---|
| 0. Paid validation (wks 1–6) | *none* — prototype only | CA$250k released |
| 1. Foundation (wks 7–14) | CC-01 | cumulative CA$1.50M |
| 2. Public + client MVP (mo 4–7) | CC-02, CC-03, CC-04, CC-05 | controlled beta; cumulative CA$3.25M **after quality gate** |
| 3. Contractor + operations (mo 7–10) | CC-06, CC-07 | prove repeatable delivery at target margin |
| 4. Intelligence + content (mo 9–12) | CC-08 | cumulative CA$4.25M |
| 5. Launch + scale (mo 12–15) | CC-09 | final CA$750k; full CA$5.00M |

---

## CC-01 — Foundation

**Requirement focus:** PUB-001*, PUB-004*, accessibility and security baselines (PRD §27).
**Full ID set:** PUB-001*, PUB-004*, CNT-001, CNT-002, CNT-005, CNT-008, BRD-001–004, ACC-012, SEC-001, SEC-003*, SEC-004*, SEC-006*, SEC-008, ARC-001, ARC-002, ARC-008, ARC-009*, DAT-001*, DAT-002, ENG-001, ENG-007, ENG-008, CMD-001, CMD-002, CMD-003*, QAG-001.

**Demonstrable outcome (§27):** monorepo, CI, environments, tokens, core layout, CMS model, audit-event skeleton, documented ADRs.

| Aspect | Content |
|---|---|
| Interface | Core layout shell, design tokens, ~10 accessible primitives with Storybook stories and interaction tests. No marketing pages yet. |
| Authorization | `/packages/auth` policy interface, deny-by-default, `test:authz` harness with the role matrix declared but mostly unimplemented resources. |
| Data | Migration tooling, `organization_id` convention + migration lint, RLS enabled, audit-event table (append-only), seed factories for the Maple Grove tenant. |
| Audit | Audit event write path in the same transaction as the action (A-11). |
| Analytics | `/packages/observability` event schema module; no events emitted yet. |
| Tests | All CMD-001 commands exist and run in CI; axe harness; cross-tenant test that must pass before any tenant-owned table ships. |
| Docs | ADRs 0001–0008 moved to `Accepted` with any amendments; data dictionary v0; threat model v0; accessibility test plan v0; runbook skeleton. |

**Migration impact:** first migrations. Rollback notes mandatory from migration #1 (ENG-006), enforced by CI check (A-22).
**Accessibility risks:** token contrast decisions made now propagate everywhere — validate the §14 palette (ink #0B2239 / teal #00A6A6 / gold #F0B44D) against WCAG 2.2 contrast for text, non-text and focus indicators *before* components are built. Gold on white is the likely failure.
**Security threats:** CI supply chain (pinned actions, lockfile integrity), secret handling in preview environments, RLS misconfiguration.
**Exit evidence:** every CMD-001 command green in CI; Storybook published; a demonstrated cross-tenant denial; a demonstrated failing build on a prohibited claim string; contrast report for all tokens.
**Non-scope:** any public page content, any authentication UI, any file upload.

---

## CC-02 — Public conversion

**Requirement focus:** PUB-001–006, CNV-001–004.
**Full ID set:** the above plus CNT-003, CNT-004, CNT-006, CNT-007, ARC-005, ARC-006, ARC-007, ANL-001, ANL-002, ANL-005, SEC-012, SEC-014, ACC-007, BRD-005, CLP-017.

**Demonstrable outcome (§27):** bilingual homepage, employee selector, qualifier, explainable result, consent-aware analytics, human-contact fallback.

| Aspect | Content |
|---|---|
| Interface | Homepage modules per §7 (notice band, hero, employee-band selector, offer architecture, method, trust layer, case narratives, resources, final CTA); qualifier; result; contact paths. EN + FR. |
| Authorization | Public surface; the authorization work here is *negative* — no client data reachable, no personalized page indexed (CNT-007). |
| Data | Qualifier session store with 30-day retention (A-15); consent records. |
| Audit | Consent grant/withdrawal is an audit event. |
| Analytics | Full §19 public taxonomy behind ADR-0007's consent gate. |
| Tests | `test:e2e` with JavaScript disabled (ARC-006); network assertion that no third-party host is contacted pre-consent (PUB-006); axe on every page in both languages; Core Web Vitals budget in CI. |
| Docs | Content governance runbook; PIA updated for qualifier data. |

**Migration impact:** qualifier session + consent tables. Retention job ships with them, dry-runnable (A-14).
**Accessibility risks:** the qualifier is the highest-risk public component — multi-step forms, progress announcement, error recovery, save-and-resume. Panel session required before release, not after. The notice band must be dismissible and must not flash or auto-scroll (§7).
**Security threats:** magic-link abuse (CNV-001) — short expiry, single use, rate limiting; qualifier enumeration; consent-bypass via client-side manipulation (server-side enforcement).
**Exit evidence:** panel session findings dispositioned; CWV field/lab numbers; FR content published through the CMS by a non-developer; a recorded screen-reader pass of the qualifier end to end; proof that `official_source_opened` fires.
**Non-scope:** payment, accounts, portal.

**Dependency:** Q-04 (counsel-reviewed claim wording), Q-06 (price fixed or configurable), Q-21 (conclusion-vs-routing rule) must be answered before this slice ships publicly. Q-05 may force this slice earlier than the roadmap implies — see [programme risks](./programme-risks.md) R-02.

---

## CC-03 — Commerce and identity

**Requirement focus:** PUB-003; client identity controls.
**Full ID set:** PUB-003, CLP-001, CLP-002, CLP-008*, CLP-013, SEC-002, SEC-011, ACC-009, DAT-003*, ARC-004, OPS-009*, ENG-003.

**Demonstrable outcome (§27):** accessible checkout/booking, organization creation, MFA, roles, agreement, project shell.

| Aspect | Content |
|---|---|
| Interface | Booking + checkout; sign-up/sign-in/MFA/recovery (custom UI per ADR-0002); organization profile; invitation and role management. |
| Authorization | The real role model begins: client admin / contributor / executive with their §18 restrictions; `test:authz` covers every resource added. |
| Data | Organization, User, membership, Project shell, consent + agreement records. |
| Audit | Sign-in, MFA enrolment, permission change, invitation, revocation, payment. |
| Analytics | `assessment_selected`, `booking_started`, `purchase_completed`. |
| Tests | Keyboard + screen-reader pass on checkout and MFA; idempotency tests on payment writes; role matrix tests. |

**Migration impact:** core identity tables; the first migrations that carry real client data — backup and rollback rehearsal required.
**Accessibility risks:** ACC-009 is where hosted third-party flows usually fail. Any payment or e-sign element that blocks keyboard/SR is replaced, not patched (§27). Q-19 may force an in-product signing flow.
**Security threats:** account takeover, invitation-link abuse, payment webhook forgery, privilege escalation via invitation role, session fixation.
**Exit evidence:** CLP-013 demonstrated live (invite two roles with different permissions, revoke, show immediate effect); MFA enrolment completed by a screen-reader user; payment retry proven idempotent.
**Non-scope:** evidence upload, contractor access, change orders (CLP-008 completes in CC-07).

---

## CC-04 — Evidence and requirements matrix

**Requirement focus:** client portal MVP.
**Full ID set:** CLP-003, CLP-004, CLP-005, CLP-012*, OPS-005*, SEC-005, SEC-007, SEC-013*, ARC-003, DAT-006.

**Demonstrable outcome (§27):** guided intake, secure file pipeline, evidence vault, versioned requirements matrix with audit history.

| Aspect | Content |
|---|---|
| Interface | Guided intake checklist with autosave and accessible validation; evidence vault with scanning states; requirements matrix with applicability, owner, reviewer, rationale, review date. |
| Authorization | Object-level checks on every evidence read; signed-URL issuance behind policy. |
| Data | Evidence (versioned), Requirement (versioned), classification, retention date, legal hold. |
| Audit | Upload, scan result, download, classification change, retention/deletion action, requirement version change. |
| Analytics | `evidence_requested`, `evidence_uploaded` — object IDs only, never file names (ANL-002). |
| Jobs | Durable queue arrives here: scan, classify, retention, notification (ARC-003). |
| Tests | Malware fixture blocked; quarantine object unreachable by any role; signed-URL expiry; retention dry-run; cross-tenant evidence denial. |

**Migration impact:** largest schema addition. Versioned entities need their history model right the first time — a later change to versioning is a data migration on client evidence.
**Accessibility risks:** upload progress and error states; drag-and-drop must have a keyboard-equivalent (ENG-004); long checklists need saved-progress announcements.
**Security threats:** this is the slice where the platform starts holding sensitive client data. Full threat-model revision required, not an update. Malware, path traversal, content-type confusion, SVG/HTML preview XSS, signed-URL leakage, quarantine bypass.
**Exit evidence:** the §24 scenario "tenant requests export and deletion" partially demonstrated; scan pipeline dead-letter review documented; PIA updated and signed by the privacy lead.
**Non-scope:** findings, reports, contractor access to evidence.

---

## CC-05 — Findings and reports

**Requirement focus:** client issue register and reports.
**Full ID set:** CLP-006, CLP-009, CLP-010, CLP-014, CLP-015, OPS-006*, OPS-011, OPS-012, ACC-008, DAT-004, QAG-003*.

**Demonstrable outcome (§27):** traceable finding lifecycle, accessible executive HTML/PDF, retest, controlled release.

| Aspect | Content |
|---|---|
| Interface | Issue register (severity, impact, reproduction, affected users, owner, due date, status, evidence, retest history); report viewer; release controls; notification preferences. |
| Authorization | Client executive sees dashboards and approved reports, not working notes (§18); reviewer segregation (DAT-004). |
| Data | Finding, Deliverable, versions, approvals, release state. |
| Audit | Finding state changes, report generation, reviewer approval, release, download. |
| Analytics | `finding_viewed`, `report_released`, `export_requested`. |
| Tests | **Negative tests are the centre of this slice**: release blocked by unresolved QA exception; release blocked by missing reviewer identity; release blocked by an expired source (OPS-011); reviewer cannot approve own high-risk work (DAT-004). |

**Migration impact:** finding/deliverable versioning; report artefacts stored as immutable versions.
**Accessibility risks:** **ACC-008 tagged PDF is the hardest accessibility problem in the programme** (Q-22). Treat accessible-PDF generation as its own workstream with manual PDF/UA verification and AT testing. Accessible HTML is the primary format; PDF must not be the only route to any information. Panel session required.
**Security threats:** report leakage via predictable URLs, premature release, export of another tenant's finding, notification content leaking finding details to unauthorized recipients.
**Exit evidence:** CLP-014 traceability demonstrated for a real finding; CLP-015 self-serve executive package downloaded by a client-role user; screen-reader review of the executive summary; PDF/UA report.
**Non-scope:** contractor-authored findings (CC-06), AI drafting (CC-08).

---

## CC-06 — Contractor delivery

**Requirement focus:** CTR-001–007.
**Full ID set:** CTR-001–007, CLP-007, SEC-003, DAT-001, QAG-003*.

**Demonstrable outcome (§27):** credentialing, capacity, scoped assignment, QA/revision workflow, contractor invoice status.

| Aspect | Content |
|---|---|
| Interface | Contractor onboarding and credential profile; capacity declaration; assignment brief; submission and revision; invoice status. |
| Authorization | **The hardest authorization surface in the platform.** Deny-by-default; per-assignment grants with expiry; field-level restriction so retail pricing and internal margin are unreachable (CTR-006, ENG-003). |
| Data | Assignment, grant, credential, insurance expiry, conflict record, scorecard. |
| Audit | Grant issued/expired/revoked, evidence accessed by contractor, submission, QA decision. |
| Analytics | `task_assigned`. |
| Tests | Contractor access expiry clock test; contractor→other-tenant denial; contractor→unassigned-evidence denial; margin/retail field absence assertion; credential-expiry auto-suspension (§10). |

**Migration impact:** assignment and grant tables; scorecard history.
**Accessibility risks:** contractors include disabled specialists — the contractor portal gets equal accessibility treatment, not a reduced standard. This is a stated business posture (§4, §15) and easy to under-resource.
**Security threats:** over-broad grants, grant persistence after closure, contractor exfiltration, conflict-of-interest bypass, insurance-expiry bypass.
**Exit evidence:** §24 scenario "contractor receives a limited assignment, accesses only approved evidence, submits findings, completes revisions and loses access after closure" passing as an automated E2E test.
**Non-scope:** capacity *planning* views (CC-07), contractor matching (CC-08).

---

## CC-07 — Operations

**Requirement focus:** internal console.
**Full ID set:** OPS-001–008, OPS-010, OPS-013, CLP-008 (completes), CLP-012 (completes), DAT-005, SEC-013, ARC-009.

**Demonstrable outcome (§27):** pipeline, delivery risk, scope/margin, capacity, requirements/content review, incident dashboard.

| Aspect | Content |
|---|---|
| Interface | Eight workspaces per §11: revenue cockpit, delivery board, capacity planner, scope builder, requirements library, QA centre, content desk, risk & incident. |
| Authorization | Internal PM vs qualified reviewer vs platform admin separation; break-glass with reason capture and alerting (DAT-005). |
| Data | Scope templates, wholesale rates, margin model, incidents, corrective actions. |
| Audit | Break-glass use, margin data access, requirement publication, content hold/release. |
| Tests | Break-glass expiry; platform admin denied routine client-content access; margin-leak alert firing. |

**Migration impact:** commercial and incident tables; read models for cross-tenant internal views (built as scoped queries under `systemContext()`, never by disabling RLS — ADR-0003).
**Accessibility risks:** dense dashboards are where accessibility quietly slips. §14 explicitly warns against "dense dashboard chrome". Data-visualization accessibility rules are needed here (§14 design-system deliverables).
**Security threats:** the console is the highest-value target — every tenant's data is reachable by design. Requires privileged-role MFA (phishing-resistant), session limits, and per-view audit.
**Exit evidence:** §24 scenario "internal PM handles an expired source, blocks an affected report, updates the requirements library and notifies impacted clients" passing; verified offboarding scenario complete (SEC-013).
**Non-scope:** AI-assisted matching or drafting.

---

## CC-08 — Care and intelligence

**Requirement focus:** AI guardrails, recurring service.
**Full ID set:** AIG-001–008, CLP-011, ANL-003, ANL-004, ENG-002.

**Demonstrable outcome (§27):** human-approved AI assists, provenance, care-plan tasks, trends, client-controlled AI setting.

| Aspect | Content |
|---|---|
| Interface | Care-plan dashboard, recurring checks, content-review queue, regression trends; AI assist surfaces with visible provenance and reviewer attribution; client AI setting. |
| Authorization | AI capability access is role-gated; client policy check precedes every call (AIG-004). |
| Data | Provenance records (immutable), capability registry, eval results, care-plan schedules. |
| Audit | Every AI invocation: capability, model, prompt version, inputs referenced, reviewer, disposition. |
| Tests | Registered-citation validator; redaction golden files; capability-registry rejection of undeclared calls; kill-switch test proving full functionality with AI disabled; eval suite gating each capability flag. |

**Migration impact:** provenance and schedule tables.
**Accessibility risks:** AI-generated client-facing text must pass plain-language and reading-level checks (AIG-006); generated content must never be the only route to information.
**Security threats:** prompt injection via client-supplied evidence text, data leakage to provider, provenance tampering, over-broad payload assembly.
**Exit evidence:** ENG-002 demonstrated — an attempt to send evidence content without an approved task is rejected and logged; kill switch exercised; eval results published.
**Non-scope:** any autonomous action; any AI in the release-approval decision itself.

**Note:** if provider terms or residency cannot be satisfied (ADR-0008 risk), this slice ships the care plan and trends without AI assists. That is an acceptable outcome and should be reported as a scope reduction, not treated as a reason to relax ENG-002.

---

## CC-09 — Hardening

**Requirement focus:** all NFRs and release gates.
**Full ID set:** ACC-001, ACC-011, ACC-013, SEC-001, SEC-008, SEC-009, SEC-010, ARC-005, QAG-003.

**Demonstrable outcome (§27):** independent audit fixes, penetration-test fixes, performance budgets, DR exercise, production runbooks.

| Activity | Evidence |
|---|---|
| Independent accessibility audit by a party not responsible for implementation (ACC-011) | Audit report + remediation log; **zero open severity-1 defects at launch** (ACC-013) |
| Penetration test against ASVS 5.0 L2 (SEC-001, SEC-008) | Report, fixes, retest verification |
| Performance hardening (ARC-005) | p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 on mobile and desktop populations separately, field data not just lab |
| DR exercise (SEC-009) | Tested restore meeting RPO ≤15 min / RTO ≤4 h, with the exercise log |
| Incident readiness (SEC-010) | Severity model, 24/7 escalation rota, client comms templates, tabletop exercise |
| All five §24 end-to-end scenarios (QAG-003) | Automated E2E + manual AT evidence with named testers |
| Production runbooks | Published, owned, and tested by someone who did not write them |

**Launch blockers (non-negotiable):** any open severity-1 accessibility defect; any severity-1 security defect; any uncontained privacy risk. Severity-2 accessibility defects require executive-approved, time-bound remediation *and* a tested accessible alternative (ACC-013).
**Non-scope:** new features. If a feature appears in CC-09, the plan has failed.

---

## Cross-slice standing work

Not a slice, but funded and scheduled throughout:

| Work | Cadence | Owner |
|---|---|---|
| Paid disability panel sessions | Discovery (Phase 0), prototype (CC-02), beta (CC-05), pre-launch (CC-09) — ACC-010 | Accessibility lead |
| Threat model revision | Every slice that adds a data class or an external boundary | Security/privacy lead |
| Traceability update | Every PR | Whoever opens the PR |
| Regulatory content revalidation | Per each claim's next-review date | AODA specialist (two-person, §20) |
| Dependency + secret scanning | Every PR and weekly scheduled | CI |
| Bilingual content sync | Continuous; FR is never allowed to silently lag | Content desk |

## What would change this plan

- **Gate 0 fails** → no slice starts; the plan is replaced by a re-scope or stop decision.
- **Q-05 (deadline vs. roadmap timing) resolves toward urgency** → CC-02 and CC-03 pull forward and CC-04/CC-05 compress, with the client MVP delivered concierge-style for longer. This is the most likely re-plan and is analysed in [programme risks](./programme-risks.md) R-02.
- **Residency review (Q-17) blocks a vendor class** → ADR-0002/0005/0007/0008 re-open before CC-01 completes.
- **PDF/UA (Q-22) proves harder than budgeted** → CC-05 extends; accessible HTML ships first with PDF following, and the offer description changes accordingly rather than the accessibility standard.
