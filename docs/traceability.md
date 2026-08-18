# Requirement traceability matrix

**Status:** Draft for approval — no application code exists yet.
**Source of truth:** [`/docs/PRD.md`](./PRD.md) (Project Northstar PRD v1.0, 2026-08-18).
**Maintained under:** PRD §27 "Build mode" — this file is updated at the end of every CC slice.

## How to read this file

| Column | Meaning |
|---|---|
| ID | Requirement identifier. **Bold** IDs are stated verbatim in the PRD. Plain IDs are **derived** by Claude Code from PRD prose/tables that carry requirements but no identifier, and require owner confirmation (see [assumptions register](./assumptions-register.md), Q-01). |
| PRD | Section the requirement is taken from. |
| Requirement | Condensed statement. The PRD text governs where this summary is thinner. |
| Slice | Delivery slice that first satisfies it (PRD §27 sequence; detail in [delivery plan](./delivery-plan.md)). |
| Verification | How acceptance is evidenced. `A` automated test, `M` manual test with named tester, `R` documented human review, `X` external/independent party. |
| State | `Not started` until code lands. Slices update this column and link evidence. |

**Rule (PRD §27):** a requirement may not be marked satisfied on automated evidence alone where an `M`, `R` or `X` is listed.

## 1. Explicit PRD requirement IDs

### Public website — PRD §7

| ID | PRD | Requirement | Acceptance criterion (PRD verbatim intent) | Slice | Verification | State |
|---|---|---|---|---|---|---|
| **PUB-001** | §7 | Responsive, bilingual, CMS-managed marketing experience. | All core pages publishable EN + FR without developer intervention; missing-translation states explicit. | CC-01 → CC-02 | A (route/lang tests), R (content desk) | Not started |
| **PUB-002** | §7 | Sector and employee-band personalization. | Profile persists with consent, changes copy/content/CTA, never hides the general site. | CC-02 | A, M (keyboard + SR), R | Not started |
| **PUB-003** | §7 | Accessible booking and checkout. | Keyboard and screen-reader users complete service, time and payment selection with no third-party a11y blocker. | CC-03 | A (axe), M (JAWS/NVDA/VO), X (vendor a11y review) | Not started |
| **PUB-004** | §7 | Evidence-backed content. | Every regulatory claim renders source URL, effective date, jurisdiction, reviewer review-date. | CC-01 (model) → CC-02 (surface) | A (schema test), R (two-person review §20) | Not started |
| **PUB-005** | §7 | Fast path to human help. | Visitor can request phone, email or relay-friendly contact without completing the qualifier. | CC-02 | A (journey), M | Not started |
| **PUB-006** | §7 | Consent-aware analytics. | No non-essential analytics before valid consent; opt-out persistent; service equivalent after opt-out. | CC-02 | A (network assertion in E2E), R (privacy lead) | Not started |

### Qualification and conversion — PRD §8

| ID | PRD | Requirement | Acceptance criterion | Slice | Verification | State |
|---|---|---|---|---|---|---|
| **CNV-001** | §8 | Save-and-resume without mandatory account creation at question one. | Secure magic link only after explicit consent; abandoned data on a short retention schedule. | CC-02 | A (link expiry + retention job), R (privacy) | Not started |
| **CNV-002** | §8 | Result explainability. | Result shows inputs, rule category and an uncertainty notice. | CC-02 | A (snapshot of rule trace), M (SR reading order), R | Not started |
| **CNV-003** | §8 | No dark patterns. | No preselected paid add-ons, false scarcity, disguised advertising, shame copy or inaccessible urgency timers. | CC-02, re-checked CC-03 | R (design + content review, per-release checklist) | Not started |
| **CNV-004** | §8 | Sales handoff context. | CRM receives consent status, profile, result, source, content history, accommodation request — and nothing unneeded. | CC-02 | A (adapter payload allowlist test), R (privacy) | Not started |

### Contractor portal — PRD §10

| ID | PRD | Requirement | Acceptance criterion | Slice | Verification | State |
|---|---|---|---|---|---|---|
| **CTR-001** | §10 | Credential and practice profile. | Stores credential type, verification source/date, sample-report review, domains, languages, insurance expiry, conflicts. | CC-06 | A, R (contractor success) | Not started |
| **CTR-002** | §10 | Capacity and availability. | Contractor declares weekly capacity, blackout dates, turnaround, max concurrent work. | CC-06 | A | Not started |
| **CTR-003** | §10 | Structured assignment brief. | Brief carries scope, inputs, exclusions, deliverables, dates, rate, revision allowance, acceptance rubric. | CC-06 | A, R | Not started |
| **CTR-004** | §10 | Scoped data access. | Contractor sees only assigned clients/files/issues/messages; access expires automatically at closure. | CC-06 | A (**authz matrix + expiry clock test**), R | Not started |
| **CTR-005** | §10 | QA and revision workflow. | Submission cannot be completed until required checks, peer review and client-facing language QA pass. | CC-06 | A (state machine), R (QA centre) | Not started |
| **CTR-006** | §10 | Financial visibility. | Contractor sees approved fee, invoice status, payment date, disputed items — never client retail pricing unless contractually required. | CC-06 | A (field-level authz test) | Not started |
| **CTR-007** | §10 | Performance record. | Internal scorecard tracks on-time delivery, first-pass acceptance, revision rate, substantiated feedback. | CC-06 → CC-07 | A, R | Not started |

## 2. Derived requirement IDs

These carry the same binding force as the PRD prose they come from; only the identifiers are Claude Code's. Confirm or rename at approval (Q-01).

### Client portal — PRD §9

| ID | Requirement | Release (PRD) | Slice | Verification | State |
|---|---|---|---|---|---|
| CLP-001 | Identity: org invitations, MFA, role management, session controls, recovery, admin transfer. | MVP | CC-03 | A, M (accessible MFA, ACC-008), X | Not started |
| CLP-002 | Organization profile: entity type, locations, employee band, sector, websites, systems, deadlines, authorized signer. | MVP | CC-03 | A | Not started |
| CLP-003 | Guided intake: dynamic checklist, autosave, accessible validation, dependencies, completion estimate. | MVP | CC-04 | A, M | Not started |
| CLP-004 | Evidence vault: secure upload, malware scan, versioning, labels, retention, preview, downloadable originals. | MVP | CC-04 | A, R (security) | Not started |
| CLP-005 | Requirements matrix: versioned requirement, applicability state, evidence link, owner, reviewer, rationale, review date. | MVP | CC-04 | A, R (AODA specialist) | Not started |
| CLP-006 | Issue register: severity, impact, reproduction, affected users, owner, due date, status, evidence, retest history. | MVP | CC-05 | A, R | Not started |
| CLP-007 | Work plan: tasks, milestones, dependencies, comments, approvals, controlled contractor visibility. | MVP | CC-06 | A (authz) | Not started |
| CLP-008 | Commercial: scope, e-signature, deposits, invoices, payment status, change orders, renewal options. | MVP | CC-03 → CC-07 | A, X (e-sign a11y review) | Not started |
| CLP-009 | Reports: accessible HTML and tagged-PDF deliverables, executive summary, appendices, version history. | MVP | CC-05 | A, M (PDF/UA + SR), R (named reviewer) | Not started |
| CLP-010 | Notifications: in-app + email preferences, digest, escalation rules, accessible templates. | MVP | CC-05 | A, M | Not started |
| CLP-011 | Care plan: recurring checks, content-review queue, training reminders, regression trends. | Phase 4 | CC-08 | A | Not started |
| CLP-012 | Data controls: export, retention schedule, deletion request, consent record, audit-log access. | MVP | CC-04 → CC-07 | A (verified-deletion journey), R (privacy) | Not started |
| CLP-013 | Client admin invites ops lead + web lead with different permissions and revokes access immediately. | MVP acceptance | CC-03 | A (authz matrix), M | Not started |
| CLP-014 | Every finding traces to evidence, reviewer, requirement version and retest state. | MVP acceptance | CC-05 | A, R | Not started |
| CLP-015 | Client self-serves an accessible executive package with no staff assembly. | MVP acceptance | CC-05 | A, M | Not started |
| CLP-016 | All core tasks completable keyboard-only, at 400% zoom, on supported screen readers. | MVP acceptance | every slice | M (per release candidate), X | Not started |
| CLP-017 | Product never labels an organization "compliant" from automated checks or incomplete evidence. | MVP acceptance | CC-02 onward | R (content review), A (prohibited-phrase lint) | Not started |

### Internal operations console — PRD §11

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| OPS-001 | Revenue cockpit: lead source, qualification result, stage, value, probability, aging, next action. | CC-07 | A | Not started |
| OPS-002 | Delivery board: milestones, blocked tasks, evidence requests, due dates, QA state, client sentiment. | CC-07 | A | Not started |
| OPS-003 | Capacity planner: skills, availability, utilization, turnaround, conflicts, performance. | CC-07 | A | Not started |
| OPS-004 | Scope builder: packages, assumptions, exclusions, wholesale rates, margin, revisions, change orders. | CC-07 | A, R | Not started |
| OPS-005 | Requirements library: versioned source, jurisdiction, interpretation note, reviewer, effective date, affected templates. | CC-04 → CC-07 | A, R (two-person, §20) | Not started |
| OPS-006 | QA centre: rubrics, exceptions, peer review, accessibility checks, release authorization. | CC-05 → CC-07 | A (release gate blocks), R | Not started |
| OPS-007 | Content desk: bilingual calendar, source review, legal review, expiry alerts, structured data. | CC-07 | A (expiry job), R | Not started |
| OPS-008 | Risk & incident: privacy incidents, complaints, conflicts, overdue credentials, security alerts, corrective actions. | CC-07 | A, R | Not started |
| OPS-009 | Automation: project shell, standard tasks and evidence checklist created after payment + agreement. | CC-03 → CC-04 | A | Not started |
| OPS-010 | Automation: alert on client-input timeline threat and on contractor capacity below threshold. | CC-07 | A | Not started |
| OPS-011 | Automation: block client release while critical QA exceptions, missing reviewer identity or expired sources remain. | CC-05 | A (**negative test required**), R | Not started |
| OPS-012 | Automation: accessible status digests in the client's preferred language and channel. | CC-05 | A, M | Not started |
| OPS-013 | Automation: flag margin leakage when time, revisions or contractor cost exceed scope assumptions. | CC-07 | A | Not started |

### AI capabilities and safeguards — PRD §12

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| AIG-001 | Permitted-use matrix enforced in code: triage, classifier, issue explainer, remediation draft, matching, report assembly — each with its named human control. | CC-08 | A (capability registry test), R | Not started |
| AIG-002 | Provenance record: model/provider, prompt-template version, input references, output, reviewer, disposition for material client-facing content. | CC-08 | A (immutable record), R | Not started |
| AIG-003 | Enterprise terms prohibiting training on client data; tenant and sensitive-workspace segregation. | CC-08 | R (procurement), X (contract review) | Not started |
| AIG-004 | "AI not used" workflow available per client and per document. | CC-08 | A (policy check blocks task) | Not started |
| AIG-005 | Redaction/minimization before model processing wherever possible. | CC-08 | A (redaction unit + golden tests) | Not started |
| AIG-006 | Pre-release testing for hallucination, inaccessible wording, bias, overconfidence, source mismatch, data leakage. | CC-08 | A (eval suite), R (accessibility + product leads) | Not started |
| AIG-007 | Uncertainty and source coverage shown; generated content never presented as independent expert review. | CC-08 | R, M | Not started |
| AIG-008 | No prohibited use: legal determination, sensitive-trait inference, invented impact, autonomous production change, protected-attribute ranking, fabricated citations. | CC-08 | A (guard tests), R | Not started |

### Content and IA — PRD §13

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| CNT-001 | Regulatory content object stores jurisdiction, source URL, effective date, last-verified date, reviewer, next-review date. | CC-01 | A (schema), R | Not started |
| CNT-002 | Bilingual page stores translation status, translator/reviewer, source-language version, sync state. | CC-01 | A | Not started |
| CNT-003 | Case narrative stores context, constraint, scope, method, result, evidence, permission state. | CC-02 | A, R | Not started |
| CNT-004 | Downloadable resources have an HTML equivalent where practical plus an accessibility QA record. | CC-02 | M, R | Not started |
| CNT-005 | Expired/disputed regulatory content shows internal hold and cannot republish without review. | CC-01 → CC-07 | A (**negative test**), R | Not started |
| CNT-006 | SEO: canonical URLs, hreflang, accessible structured data, semantic headings, XML sitemaps, SSR critical content. | CC-02 | A | Not started |
| CNT-007 | Personalized result pages are not indexed; client information never appears in URLs. | CC-02 | A (robots + URL-shape test) | Not started |
| CNT-008 | Mandatory wording enforced; prohibited claims ("certified compliant", "government approved", "guaranteed protection") blocked. | CC-01 | A (content lint in CI), R | Not started |

### Design system and motion — PRD §14

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| BRD-001 | Design tokens: colour (ink #0B2239, teal #00A6A6, gold #F0B44D accent), type scale, spacing, elevation, grid. | CC-01 | A (token contrast tests) | Not started |
| BRD-002 | 16px minimum body, ~70ch measure, no colour-only status. | CC-01 | A, M | Not started |
| BRD-003 | Motion: 120–240 ms transitions, `prefers-reduced-motion` equivalents, pause controls, no auto-advance/parallax/flash. | CC-01 | A, M | Not started |
| BRD-004 | No component reaches production before documented keyboard, focus, SR, zoom and contrast behaviours pass. | every slice | A (Storybook interaction), M | Not started |
| BRD-005 | Imagery consent and descriptive alt text recorded per asset. | CC-02 | R | Not started |

### Accessibility — PRD §15

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ACC-001 | WCAG 2.2 AA across public site, portals and generated client artefacts. | every slice | A (axe), M, X (independent audit CC-09) | Not started |
| ACC-002 | Keyboard: full operation, visible focus, logical order, no trap, skip links, predictable shortcuts. | every slice | A, M | Not started |
| ACC-003 | Screen readers: JAWS+Chrome/Edge, NVDA+Firefox/Chrome, VoiceOver+Safari, TalkBack+Chrome on agreed versions. | every slice | M (named tester, versions logged) | Not started |
| ACC-004 | Visual: text and non-text contrast, 200% resize, 400% zoom/reflow, Windows High Contrast. | every slice | A, M | Not started |
| ACC-005 | Motor/touch: target size and spacing, gesture alternatives, no drag-only interaction, generous extendable timeouts. | every slice | A, M | Not started |
| ACC-006 | Cognitive: plain language, consistent navigation, visible progress, recoverable errors, calm notifications. | every slice | R, M (panel) | Not started |
| ACC-007 | Media: captions, transcripts, audio-description strategy, no surprise playback, accessible controls. | CC-02 | M | Not started |
| ACC-008 | Documents: tagged PDF/Office, reading order, language, headings, lists, tables, links, alt text, accessible alternatives. | CC-05 | M (PDF/UA check + AT), R | Not started |
| ACC-009 | Authentication: accessible MFA, password-manager support, paste allowed, alternative verification, accessible recovery. | CC-03 | M | Not started |
| ACC-010 | Paid disability-panel sessions at discovery, prototype, beta and pre-launch. | Phase 0, CC-02, CC-05, CC-09 | X (panel sessions, compensated) | Not started |
| ACC-011 | Independent pre-launch audit by a party not responsible for implementation. | CC-09 | X | Not started |
| ACC-012 | Severity model, remediation owner, due date, retest evidence, exception approval documented. | CC-01 | R | Not started |
| ACC-013 | **Launch blocker:** zero open severity-1 a11y defects; severity-2 requires executive-approved time-bound plan and a tested accessible alternative. | CC-09 | R (accessibility lead stop-ship), X | Not started |

### Security, privacy and resilience — PRD §16

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| SEC-001 | Design and verify against OWASP ASVS 5.0 Level 2; OWASP Top 10 for training/awareness. | CC-01 baseline, CC-09 verify | R, X (pen test) | Not started |
| SEC-002 | MFA for clients, contractors and staff; phishing-resistant option for privileged roles; SSO for higher tiers; device/session management. | CC-03 | A, X | Not started |
| SEC-003 | Tenant isolation, RBAC, scoped project permissions, deny-by-default contractor access, periodic access review, immediate revocation. | CC-01 skeleton → CC-06 | A (`test:authz`, cross-tenant suite) | Not started |
| SEC-004 | TLS in transit, strong encryption at rest, managed keys/secrets, signed expiring download URLs, encrypted backups, data-residency review. | CC-01 → CC-04 | A, R | Not started |
| SEC-005 | Uploads: malware scan, type/size validation, quarantine, safe preview, content-disposition controls, no executables. | CC-04 | A (EICAR-style fixture), R | Not started |
| SEC-006 | Immutable audit log for sign-in, access, download, export, permission change, report release, AI use, deletion. | CC-01 skeleton, extended per slice | A | Not started |
| SEC-007 | Privacy: purpose limitation, minimization, consent records, retention/deletion schedules, subprocessor register, PIA, request workflow. | CC-02 → CC-04 | R (privacy lead), A (retention jobs) | Not started |
| SEC-008 | Assurance: threat model, code review, dependency scanning, secret scanning, annual independent pen test, remediation verification. | CC-01 (CI) → CC-09 | A (CI gates), X | Not started |
| SEC-009 | Resilience: 99.95% portal availability, RPO ≤15 min, RTO ≤4 h, tested restore and annual incident exercise. | CC-09 | A (SLO alerts), X (DR exercise) | Not started |
| SEC-010 | Incident response: severity model, 24/7 critical escalation, evidence preservation, client comms templates, contractual notification. | CC-09 | R | Not started |
| SEC-011 | Disability/accommodation data collected only when needed, access-restricted, shorter retention. | CC-03 | A, R | Not started |
| SEC-012 | Marketing consent separated from service communications; non-essential consent never a purchase condition. | CC-02 → CC-03 | A, R | Not started |
| SEC-013 | Organization-level export, offboarding and verified deletion with legal-hold handling. | CC-04 → CC-07 | A (E2E scenario §24), R | Not started |
| SEC-014 | Plain-language privacy summary + detailed policy, both naming subprocessors and contact routes. | CC-02 | R | Not started |

### Architecture and performance — PRD §17

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ARC-001 | TypeScript monorepo, server-rendered React framework, PostgreSQL, S3-compatible storage, managed standards-based IdP, structured headless CMS, event-driven adapters; versions pinned in a committed lockfile. | CC-01 | A (build), R (ADR-0001) | Not started |
| ARC-002 | Vendor choices replaceable behind domain interfaces; documented exit plan per vendor. | CC-01 onward | R (ADR review) | Not started |
| ARC-003 | Durable job queue for scanning, report generation, integration sync, notifications, retention, AI; retries and dead-letter review. | CC-04 | A | Not started |
| ARC-004 | Idempotency for external writes; predictable error envelopes; schema validation at every boundary. | CC-03 | A | Not started |
| ARC-005 | Core Web Vitals at p75: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1, mobile and desktop populations separately. | CC-02 budget, CC-09 verify | A (CI budget + field RUM) | Not started |
| ARC-006 | Critical public pages render useful primary content without client-side JavaScript. | CC-02 | A (JS-disabled journey test) | Not started |
| ARC-007 | Every third-party script has a documented owner, purpose, consent category and performance budget. | CC-02 | R, A (script allowlist) | Not started |
| ARC-008 | Deployment: preview environments, protected production, migration checks, staged rollout, rollback path, IaC. | CC-01 | A (pipeline), R | Not started |
| ARC-009 | Observability: structured redacted logs, traces, metrics, audit events, SLO alerts, support-visible correlation IDs. | CC-01 → CC-07 | A, R | Not started |

### Data model and permissions — PRD §18

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| DAT-001 | Entities: Organization, User, Project, Requirement, Evidence, Finding, Assignment, Deliverable, Audit event. | CC-01 (skeleton) → CC-06 | A (migrations + factories) | Not started |
| DAT-002 | Tenant ID on all tenant-owned data with database-level enforcement where practical. | CC-01 | A (cross-tenant tests) | Not started |
| DAT-003 | Role model enforced with its restrictions: client admin, client contributor, client executive, contractor, internal PM, qualified reviewer, platform admin. | CC-03 → CC-07 | A (role matrix test per protected resource class) | Not started |
| DAT-004 | Qualified reviewer cannot approve their own high-risk work where segregation is required. | CC-05 | A (**negative test**), R | Not started |
| DAT-005 | Platform admin break-glass access is time-bound, logged and reviewed; no routine client-content access. | CC-07 | A, R | Not started |
| DAT-006 | Soft delete only where retention requires it. | CC-04 | R (data dictionary) | Not started |

### Analytics and experimentation — PRD §19

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ANL-001 | Event taxonomy implemented exactly as listed in §19 (source_viewed … support_contacted). | CC-02 onward | A (event contract tests) | Not started |
| ANL-002 | Events carry no raw document content and no unnecessary personal data. | CC-02 | A (payload allowlist), R (privacy) | Not started |
| ANL-003 | KPI instrumentation for the §19 metric layers (activation, revenue, expansion, economics, delivery, quality, customer, accessibility, retention). | CC-02 → CC-08 | A, R | Not started |
| ANL-004 | Experiment guardrails: no fear/shame/misleading-deadline/inaccessible/hidden-cost variants; primary + harm metrics and stopping rules pre-declared. | CC-08 | R (experiment intake review) | Not started |
| ANL-005 | No personalization of legal/regulatory claims without source-backed rule logic and qualified review. | CC-02 | A, R | Not started |

### Quality gates and definition of done — PRD §24

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| QAG-001 | Six acceptance gates with their stop-ship conditions (discovery, design system, feature, content, release candidate, client deliverable). | CC-01 (documented) → CC-09 | R | Not started |
| QAG-002 | Definition of done applied per PR: acceptance criteria, a11y checks, threat/privacy update, bilingual state, analytics accuracy, docs + rollback. | every PR | R (PR evidence template §27) | Not started |
| QAG-003 | Five representative end-to-end scenarios pass (keyboard HR lead; blind executive; scoped contractor; PM handling expired source; tenant export/deletion). | CC-05, CC-06, CC-07, CC-09 | A (`test:e2e`), M | Not started |

### Engineering constraints and command contract — PRD §27

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ENG-001 | Authorization never lives only in UI components; enforced at server/domain and storage boundaries. | CC-01 onward | A (`test:authz`), R (code review) | Not started |
| ENG-002 | Evidence-file contents never sent to an AI provider by default; requires approved task, minimal payload, client policy check, logged provenance. | CC-08 | A (guard test), R | Not started |
| ENG-003 | No storage keys, sequential tenant IDs, internal margins or private audit notes in client URLs or analytics. | CC-03 onward | A (URL/payload lint) | Not started |
| ENG-004 | No interaction dependent on hover, drag, colour, animation or pointer precision alone. | every slice | A, M | Not started |
| ENG-005 | Accessibility work never closed on automated tooling alone; manual evidence and named reviewer linked. | every slice | R | Not started |
| ENG-006 | No production migration without rollback/roll-forward notes, backup impact and a test on representative data. | every migration | R (PR gate) | Not started |
| ENG-007 | Regulatory claims never hard-coded in components; rendered from versioned content objects with sources and review dates. | CC-01 | A (component lint), R | Not started |
| ENG-008 | Never claim "AODA certified", "government approved" or substitute for client certification/legal advice. | CC-01 | A (content lint), R (counsel) | Not started |
| CMD-001 | Commands exist and exit non-zero on failure: `install`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `test:a11y`, `test:authz`, `db:migrate`, `db:seed`, `db:reset-safe`, `build`, `start`. | CC-01 | A (CI runs each) | Not started |
| CMD-002 | Root README documents exact commands and seed accounts. | CC-01 | R | Not started |
| CMD-003 | Seed scenario is fictional: "Maple Grove Learning Group", 86 employees, two sites, Dec 2026 project, 5 evidence objects, 4 mixed-severity findings, 1 approved change order, 1 assigned auditor, all seven role users; tenant/role boundaries visible; no real certifications. | CC-01 → CC-06 | A (seed test), R | Not started |

## 3. Coverage summary by slice

| Slice | Primary IDs | Count |
|---|---|---|
| CC-01 Foundation | PUB-001*, PUB-004*, CNT-001/002/005/008, BRD-001–004, SEC-001/003*/004*/006*/008, ARC-001/002/008/009*, DAT-001*/002, ACC-012, ENG-001/007/008, CMD-001–003*, QAG-001 | 26 |
| CC-02 Public conversion | PUB-001–006, CNV-001–004, CNT-003/004/006/007, ARC-005/006/007, ANL-001/002/005, SEC-012/014, ACC-007, BRD-005, CLP-017 | 25 |
| CC-03 Commerce + identity | PUB-003, CLP-001/002/008*/013, SEC-002/011, ACC-009, DAT-003*, ARC-004, OPS-009*, ENG-003 | 13 |
| CC-04 Evidence + matrix | CLP-003/004/005/012*, OPS-005*, SEC-005/007/013*, ARC-003, DAT-006 | 10 |
| CC-05 Findings + reports | CLP-006/009/010/014/015, OPS-006*/011/012, ACC-008, DAT-004, QAG-003* | 11 |
| CC-06 Contractor delivery | CTR-001–007, CLP-007, SEC-003, DAT-001, QAG-003* | 11 |
| CC-07 Operations | OPS-001–008/010/013, CLP-008/012, DAT-005, SEC-013, ARC-009 | 17 |
| CC-08 Care + intelligence | AIG-001–008, CLP-011, ANL-003/004, ENG-002 | 12 |
| CC-09 Hardening | ACC-001/011/013, SEC-001/008/009/010, ARC-005, QAG-003 | 9 |

`*` = started in this slice, completed later.

## 4. Requirements with no owning slice yet

These are PRD obligations that are organizational rather than code, tracked here so they are not lost:

| ID | Requirement | Owner (PRD §21) | Where it lands |
|---|---|---|---|
| ORG-001 | Standing paid disability research panel recruited and compensated (§4, §15). | Accessibility lead | Phase 0 |
| ORG-002 | Contractor network admission standard: identity, registration, references, confidentiality, insurance, IAAP verification, paid calibration (§10). | COO / contractor success | Phase 0 → CC-06 |
| ORG-003 | Counsel review of the legal-baseline matrix and all marketing claims (§2, §26). | AODA specialist + counsel | Phase 0, blocking for PUB-004 |
| ORG-004 | Two-person review process for regulatory content changes (§20). | AODA specialist | CC-01 (process), CC-07 (tooling) |
| ORG-005 | Trademark, domain, language and cultural review of "Project Northstar" before public use (§26). | Founder | Before CC-02 public launch |
| ORG-006 | Professional, cyber and general liability insurance secured (§25). | COO | Phase 0 |
