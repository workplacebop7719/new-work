# Requirement traceability matrix

**Status:** CC-01, CC-02 and the CC-02b marketing surface delivered, plus a hardening pass. CC-03 not started.
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
| State | `Done` = satisfied and evidenced. `Partial` = the CC-01 share is done, later slices complete it. `Not started` = no code yet. |

**Rule (PRD §27):** a requirement may not be marked satisfied on automated evidence alone where an `M`, `R` or `X` is listed.

## 1. Explicit PRD requirement IDs

### Public website — PRD §7

| ID | PRD | Requirement | Acceptance criterion (PRD verbatim intent) | Slice | Verification | State |
|---|---|---|---|---|---|---|
| **PUB-001** | §7 | Responsive, bilingual, CMS-managed marketing experience. | All core pages publishable EN + FR without developer intervention; missing-translation states explicit. | CC-01 → CC-02 | A (route/lang tests), R (content desk) | Done |
| **PUB-002** | §7 | Sector and employee-band personalization. | Profile persists with consent, changes copy/content/CTA, never hides the general site. | CC-02 | A, M (keyboard + SR), R | Done |
| **PUB-003** | §7 | Accessible booking and checkout. | Keyboard and screen-reader users complete service, time and payment selection with no third-party a11y blocker. | CC-03 | A (axe), M (JAWS/NVDA/VO), X (vendor a11y review) | Not started |
| **PUB-004** | §7 | Evidence-backed content. | Every regulatory claim renders source URL, effective date, jurisdiction, reviewer review-date. | CC-01 (model) → CC-02 (surface) | A (schema test), R (two-person review §20) | Partial |
| **PUB-005** | §7 | Fast path to human help. | Visitor can request phone, email or relay-friendly contact without completing the qualifier. | CC-02 | A (journey), M | Done |
| **PUB-006** | §7 | Consent-aware analytics. | No non-essential analytics before valid consent; opt-out persistent; service equivalent after opt-out. | CC-02 | A (network assertion in E2E), R (privacy lead) | Done |

### Qualification and conversion — PRD §8

| ID | PRD | Requirement | Acceptance criterion | Slice | Verification | State |
|---|---|---|---|---|---|---|
| **CNV-001** | §8 | Save-and-resume without mandatory account creation at question one. | Secure magic link only after explicit consent; abandoned data on a short retention schedule. | CC-02 | A (link expiry + retention job), R (privacy) | Done |
| **CNV-002** | §8 | Result explainability. | Result shows inputs, rule category and an uncertainty notice. | CC-02 | A (snapshot of rule trace), M (SR reading order), R | Done |
| **CNV-003** | §8 | No dark patterns. | No preselected paid add-ons, false scarcity, disguised advertising, shame copy or inaccessible urgency timers. | CC-02, re-checked CC-03 | R (design + content review, per-release checklist) | Done |
| **CNV-004** | §8 | Sales handoff context. | CRM receives consent status, profile, result, source, content history, accommodation request — and nothing unneeded. | CC-02 | A (adapter payload allowlist test), R (privacy) | Partial |

### Contractor portal — PRD §10

| ID | PRD | Requirement | Acceptance criterion | Slice | Verification | State |
|---|---|---|---|---|---|---|
| **CTR-001** | §10 | Credential and practice profile. | Stores credential type, verification source/date, sample-report review, domains, languages, insurance expiry, conflicts. | CC-06 | A, R (contractor success) | Not started |
| **CTR-002** | §10 | Capacity and availability. | Contractor declares weekly capacity, blackout dates, turnaround, max concurrent work. | CC-06 | A | Not started |
| **CTR-003** | §10 | Structured assignment brief. | Brief carries scope, inputs, exclusions, deliverables, dates, rate, revision allowance, acceptance rubric. | CC-06 | A, R | Not started |
| **CTR-004** | §10 | Scoped data access. | Contractor sees only assigned clients/files/issues/messages; access expires automatically at closure. | CC-06 | A (**authz matrix + expiry clock test**), R | Partial |
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
| CLP-017 | Product never labels an organization "compliant" from automated checks or incomplete evidence. | MVP acceptance | CC-02 onward | R (content review), A (prohibited-phrase lint) | Done |

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
| OPS-011 | Automation: block client release while critical QA exceptions, missing reviewer identity or expired sources remain. | CC-05 | A (**negative test required**), R | Partial |
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
| CNT-001 | Regulatory content object stores jurisdiction, source URL, effective date, last-verified date, reviewer, next-review date. | CC-01 | A (schema), R | Done |
| CNT-002 | Bilingual page stores translation status, translator/reviewer, source-language version, sync state. | CC-01 | A | Done |
| CNT-003 | Case narrative stores context, constraint, scope, method, result, evidence, permission state. | CC-02 | A, R | Partial |
| CNT-004 | Downloadable resources have an HTML equivalent where practical plus an accessibility QA record. | CC-02 | M, R | Not started |
| CNT-005 | Expired/disputed regulatory content shows internal hold and cannot republish without review. | CC-01 → CC-07 | A (**negative test**), R | Done |
| CNT-006 | SEO: canonical URLs, hreflang, accessible structured data, semantic headings, XML sitemaps, SSR critical content. | CC-02 | A | Done |
| CNT-007 | Personalized result pages are not indexed; client information never appears in URLs. | CC-02 | A (robots + URL-shape test) | Done |
| CNT-008 | Mandatory wording enforced; prohibited claims ("certified compliant", "government approved", "guaranteed protection") blocked. | CC-01 | A (content lint in CI), R | Done |

### Design system and motion — PRD §14

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| BRD-001 | Design tokens: colour (ink #0B2239, teal #00A6A6, gold #F0B44D accent), type scale, spacing, elevation, grid. | CC-01 | A (token contrast tests) | Done |
| BRD-002 | 16px minimum body, ~70ch measure, no colour-only status. | CC-01 | A, M | Done |
| BRD-003 | Motion: 120–240 ms transitions, `prefers-reduced-motion` equivalents, pause controls, no auto-advance/parallax/flash. | CC-01 | A, M | Done |
| BRD-004 | No component reaches production before documented keyboard, focus, SR, zoom and contrast behaviours pass. | every slice | A (Storybook interaction), M | Done |
| BRD-005 | Imagery consent and descriptive alt text recorded per asset. | CC-02 | R | Not started |

### Accessibility — PRD §15

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ACC-001 | WCAG 2.2 AA across public site, portals and generated client artefacts. | every slice | A (axe), M, X (independent audit CC-09) | Partial |
| ACC-002 | Keyboard: full operation, visible focus, logical order, no trap, skip links, predictable shortcuts. | every slice | A, M | Partial |
| ACC-003 | Screen readers: JAWS+Chrome/Edge, NVDA+Firefox/Chrome, VoiceOver+Safari, TalkBack+Chrome on agreed versions. | every slice | M (named tester, versions logged) | Not started |
| ACC-004 | Visual: text and non-text contrast, 200% resize, 400% zoom/reflow, Windows High Contrast. | every slice | A, M | Partial |
| ACC-005 | Motor/touch: target size and spacing, gesture alternatives, no drag-only interaction, generous extendable timeouts. | every slice | A, M | Not started |
| ACC-006 | Cognitive: plain language, consistent navigation, visible progress, recoverable errors, calm notifications. | every slice | R, M (panel) | Not started |
| ACC-007 | Media: captions, transcripts, audio-description strategy, no surprise playback, accessible controls. | CC-02 | M | Not started |
| ACC-008 | Documents: tagged PDF/Office, reading order, language, headings, lists, tables, links, alt text, accessible alternatives. | CC-05 | M (PDF/UA check + AT), R | Not started |
| ACC-009 | Authentication: accessible MFA, password-manager support, paste allowed, alternative verification, accessible recovery. | CC-03 | M | Not started |
| ACC-010 | Paid disability-panel sessions at discovery, prototype, beta and pre-launch. | Phase 0, CC-02, CC-05, CC-09 | X (panel sessions, compensated) | Not started |
| ACC-011 | Independent pre-launch audit by a party not responsible for implementation. | CC-09 | X | Not started |
| ACC-012 | Severity model, remediation owner, due date, retest evidence, exception approval documented. | CC-01 | R | Done |
| ACC-013 | **Launch blocker:** zero open severity-1 a11y defects; severity-2 requires executive-approved time-bound plan and a tested accessible alternative. | CC-09 | R (accessibility lead stop-ship), X | Not started |

### Security, privacy and resilience — PRD §16

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| SEC-001 | Design and verify against OWASP ASVS 5.0 Level 2; OWASP Top 10 for training/awareness. | CC-01 baseline, CC-09 verify | R, X (pen test) | Partial |
| SEC-002 | MFA for clients, contractors and staff; phishing-resistant option for privileged roles; SSO for higher tiers; device/session management. | CC-03 | A, X | Not started |
| SEC-003 | Tenant isolation, RBAC, scoped project permissions, deny-by-default contractor access, periodic access review, immediate revocation. | CC-01 skeleton → CC-06 | A (`test:authz`, cross-tenant suite) | Partial |
| SEC-004 | TLS in transit, strong encryption at rest, managed keys/secrets, signed expiring download URLs, encrypted backups, data-residency review. | CC-01 → CC-04 | A, R | Partial |
| SEC-005 | Uploads: malware scan, type/size validation, quarantine, safe preview, content-disposition controls, no executables. | CC-04 | A (EICAR-style fixture), R | Not started |
| SEC-006 | Immutable audit log for sign-in, access, download, export, permission change, report release, AI use, deletion. | CC-01 skeleton, extended per slice | A | Done |
| SEC-007 | Privacy: purpose limitation, minimization, consent records, retention/deletion schedules, subprocessor register, PIA, request workflow. | CC-02 → CC-04 | R (privacy lead), A (retention jobs) | Partial |
| SEC-008 | Assurance: threat model, code review, dependency scanning, secret scanning, annual independent pen test, remediation verification. | CC-01 (CI) → CC-09 | A (CI gates), X | Partial |
| SEC-009 | Resilience: 99.95% portal availability, RPO ≤15 min, RTO ≤4 h, tested restore and annual incident exercise. | CC-09 | A (SLO alerts), X (DR exercise) | Not started |
| SEC-010 | Incident response: severity model, 24/7 critical escalation, evidence preservation, client comms templates, contractual notification. | CC-09 | R | Not started |
| SEC-011 | Disability/accommodation data collected only when needed, access-restricted, shorter retention. | CC-03 | A, R | Not started |
| SEC-012 | Marketing consent separated from service communications; non-essential consent never a purchase condition. | CC-02 → CC-03 | A, R | Done |
| SEC-013 | Organization-level export, offboarding and verified deletion with legal-hold handling. | CC-04 → CC-07 | A (E2E scenario §24), R | Not started |
| SEC-014 | Plain-language privacy summary + detailed policy, both naming subprocessors and contact routes. | CC-02 | R | Not started |

### Architecture and performance — PRD §17

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ARC-001 | TypeScript monorepo, server-rendered React framework, PostgreSQL, S3-compatible storage, managed standards-based IdP, structured headless CMS, event-driven adapters; versions pinned in a committed lockfile. | CC-01 | A (build), R (ADR-0001) | Done |
| ARC-002 | Vendor choices replaceable behind domain interfaces; documented exit plan per vendor. | CC-01 onward | R (ADR review) | Done |
| ARC-003 | Durable job queue for scanning, report generation, integration sync, notifications, retention, AI; retries and dead-letter review. | CC-04 | A | Not started |
| ARC-004 | Idempotency for external writes; predictable error envelopes; schema validation at every boundary. | CC-03 | A | Done |
| ARC-005 | Core Web Vitals at p75: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1, mobile and desktop populations separately. | CC-02 budget, CC-09 verify | A (CI budget + field RUM) | Partial |
| ARC-006 | Critical public pages render useful primary content without client-side JavaScript. | CC-02 | A (JS-disabled journey test) | Done |
| ARC-007 | Every third-party script has a documented owner, purpose, consent category and performance budget. | CC-02 | R, A (script allowlist) | Done |
| ARC-008 | Deployment: preview environments, protected production, migration checks, staged rollout, rollback path, IaC. | CC-01 | A (pipeline), R | Partial |
| ARC-009 | Observability: structured redacted logs, traces, metrics, audit events, SLO alerts, support-visible correlation IDs. | CC-01 → CC-07 | A, R | Partial |

### Data model and permissions — PRD §18

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| DAT-001 | Entities: Organization, User, Project, Requirement, Evidence, Finding, Assignment, Deliverable, Audit event. | CC-01 (skeleton) → CC-06 | A (migrations + factories) | Partial |
| DAT-002 | Tenant ID on all tenant-owned data with database-level enforcement where practical. | CC-01 | A (cross-tenant tests) | Done |
| DAT-003 | Role model enforced with its restrictions: client admin, client contributor, client executive, contractor, internal PM, qualified reviewer, platform admin. | CC-03 → CC-07 | A (role matrix test per protected resource class) | Partial |
| DAT-004 | Qualified reviewer cannot approve their own high-risk work where segregation is required. | CC-05 | A (**negative test**), R | Done |
| DAT-005 | Platform admin break-glass access is time-bound, logged and reviewed; no routine client-content access. | CC-07 | A, R | Done |
| DAT-006 | Soft delete only where retention requires it. | CC-04 | R (data dictionary) | Not started |

### Analytics and experimentation — PRD §19

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ANL-001 | Event taxonomy implemented exactly as listed in §19 (source_viewed … support_contacted). | CC-02 onward | A (event contract tests) | Done |
| ANL-002 | Events carry no raw document content and no unnecessary personal data. | CC-02 | A (payload allowlist), R (privacy) | Done |
| ANL-003 | KPI instrumentation for the §19 metric layers (activation, revenue, expansion, economics, delivery, quality, customer, accessibility, retention). | CC-02 → CC-08 | A, R | Partial |
| ANL-004 | Experiment guardrails: no fear/shame/misleading-deadline/inaccessible/hidden-cost variants; primary + harm metrics and stopping rules pre-declared. | CC-08 | R (experiment intake review) | Not started |
| ANL-005 | No personalization of legal/regulatory claims without source-backed rule logic and qualified review. | CC-02 | A, R | Done |

### Quality gates and definition of done — PRD §24

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| QAG-001 | Six acceptance gates with their stop-ship conditions (discovery, design system, feature, content, release candidate, client deliverable). | CC-01 (documented) → CC-09 | R | Done |
| QAG-002 | Definition of done applied per PR: acceptance criteria, a11y checks, threat/privacy update, bilingual state, analytics accuracy, docs + rollback. | every PR | R (PR evidence template §27) | Not started |
| QAG-003 | Five representative end-to-end scenarios pass (keyboard HR lead; blind executive; scoped contractor; PM handling expired source; tenant export/deletion). | CC-05, CC-06, CC-07, CC-09 | A (`test:e2e`), M | Not started |

### Engineering constraints and command contract — PRD §27

| ID | Requirement | Slice | Verification | State |
|---|---|---|---|---|
| ENG-001 | Authorization never lives only in UI components; enforced at server/domain and storage boundaries. | CC-01 onward | A (`test:authz`), R (code review) | Done |
| ENG-002 | Evidence-file contents never sent to an AI provider by default; requires approved task, minimal payload, client policy check, logged provenance. | CC-08 | A (guard test), R | Partial |
| ENG-003 | No storage keys, sequential tenant IDs, internal margins or private audit notes in client URLs or analytics. | CC-03 onward | A (URL/payload lint) | Done |
| ENG-004 | No interaction dependent on hover, drag, colour, animation or pointer precision alone. | every slice | A, M | Done |
| ENG-005 | Accessibility work never closed on automated tooling alone; manual evidence and named reviewer linked. | every slice | R | Not started |
| ENG-006 | No production migration without rollback/roll-forward notes, backup impact and a test on representative data. | every migration | R (PR gate) | Done |
| ENG-007 | Regulatory claims never hard-coded in components; rendered from versioned content objects with sources and review dates. | CC-01 | A (component lint), R | Done |
| ENG-008 | Never claim "AODA certified", "government approved" or substitute for client certification/legal advice. | CC-01 | A (content lint), R (counsel) | Done |
| CMD-001 | Commands exist and exit non-zero on failure: `install`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `test:a11y`, `test:authz`, `db:migrate`, `db:seed`, `db:reset-safe`, `build`, `start`. | CC-01 | A (CI runs each) | Done |
| CMD-002 | Root README documents exact commands and seed accounts. | CC-01 | R | Done |
| CMD-003 | Seed scenario is fictional: "Maple Grove Learning Group", 86 employees, two sites, Dec 2026 project, 5 evidence objects, 4 mixed-severity findings, 1 approved change order, 1 assigned auditor, all seven role users; tenant/role boundaries visible; no real certifications. | CC-01 → CC-06 | A (seed test), R | Partial |

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

---

## 5. CC-01 delivery record

**Delivered:** the foundation slice. **Evidence:** 214 unit/integration tests, 37 Playwright tests, 6 repository guards — all green. Commands in the PRD §27 contract all exist and exit non-zero on failure.

### What each `Done` above actually rests on

| Requirement | Evidence |
|---|---|
| DAT-002, SEC-003 (storage layer) | `packages/db/test/tenant-isolation.test.ts` — a `SELECT` with no `WHERE` returns only the current tenant; a foreign-tenant `INSERT` is rejected; no tenant context returns zero rows. Run against live PostgreSQL as a `NOBYPASSRLS` role. |
| ENG-001, DAT-003, DAT-004, DAT-005, CTR-004 | `packages/auth/src/policy.test.ts` — 106 assertions, including a completeness test that fails when a resource class has no cross-tenant coverage. |
| SEC-006 | Append-only proven twice: no UPDATE/DELETE grant, plus a trigger. Both paths tested. |
| BRD-001, BRD-002, ACC-004 (tokens) | `tokens.contrast.test.ts` — 20 token pairs computed against WCAG thresholds, plus negative tests pinning the brand-colour restrictions. |
| BRD-003, BRD-004, ACC-002 | 10 primitives with axe and keyboard tests; `apps/web/e2e/shell.spec.ts` asserts a visible focus indicator on every interactive element. |
| ARC-006 | A dedicated Playwright project runs with JavaScript disabled at browser level. |
| CNT-001, CNT-005, ENG-007 | `packages/domain/src/content.test.ts` — a claim past its review date cannot render; the hold branch has no `text` field. Confirmed end-to-end in the browser. |
| ANL-001, ANL-002 | Closed event taxonomy matching PRD §19 exactly; strict per-event schemas; global forbidden-property denylist; consent gate in the dispatcher. |
| ENG-006, ENG-008, DAT-002, ARC-002, BRD-001 (drift) | Six guards in `scripts/guards/`, run by `pnpm lint` and in CI. Each was negative-tested — confirmed to fail on a real violation, not just to pass. |

### Deliberately not done in CC-01, and why

| Item | Reason | Lands in |
|---|---|---|
| Storybook harness | The accessibility *contracts* are tested (axe + keyboard + semantics per component). Storybook is developer experience and is retrofittable; it was cut to keep the slice from sprawling. **This is a scope reduction from the CC-01 plan and is called out rather than quietly dropped.** | CC-02 |
| One approved change order in the demo seed (CMD-003) | Commercial tables do not exist until CC-03/CC-07. Every other element of the §27 demo scenario is seeded. | CC-03 |
| Manual screen-reader / zoom pass, panel session | CC-01 has no user-facing task to test. ENG-005 means the automated passes above do **not** count as accessibility sign-off. | CC-02 exit |
| Content-Security-Policy beyond baseline headers | A nonce-based policy needs a real page to be measured against. | CC-02 |
| Rate limiting | No public form or auth endpoint exists yet. | CC-02 |
| Real integration adapters | Vendor questions Q-14/Q-15/Q-16 are open. Ports and fakes are complete, so adapters drop in behind them. | CC-03 |

### Decisions taken during the build that need review

1. **The PRD's palette does not pass WCAG as specified.** Brand teal `#00A6A6` is 2.998:1 on white — it fails AA for text *and* misses the 3:1 non-text bar by 0.002. Warm gold `#F0B44D` is 1.85:1, so it cannot even carry its own edge against a white page. The tokens therefore restrict brand teal to decoration, introduce `interactive` `#00706F` (5.92:1) for links, buttons and focus, add `graphic-brand` `#00A0A0` (3.21:1) for meaningful graphics, and require an ink border on any gold surface. Visually near-identical; needs the design lead's sign-off (**new question Q-24**).
2. **TypeScript pinned to 5.9.3, not the 7.0.2 `latest`.** The native port is current but the framework and lint toolchain do not yet target it. Recorded in ADR-0001 with a CC-02 review trigger.
3. **No ORM.** Hand-written SQL migrations, because RLS policies, `SET LOCAL` tenant context and append-only grants are exactly what an ORM hides. Recorded in ADR-0001.
4. **Library packages emit no build output.** They ship TypeScript source compiled by the app (Turborepo internal-package pattern). Recorded in ADR-0001.

---

## 6. CC-02 delivery record

**Delivered:** the public conversion slice — bilingual qualifier, explainable result, consent-aware analytics and a human-contact fallback.
**Evidence:** 241 unit/integration tests, 107 Playwright tests, 7 repository guards — all green.

### What each `Done` rests on

| Requirement | Evidence |
|---|---|
| PUB-006 consent | Consent is enforced in the dispatcher, not a script tag. A Playwright test fails the build if **any** request to a non-local host occurs before a decision. `readConsent` treats "no decision" as refusal — the absence of a cookie is never consent. |
| CNV-003 no dark patterns | Accept and decline are the same control with the same classes; a test asserts the class strings are identical, so visually demoting "decline" fails CI. No answer is preselected; the email-consent box is never pre-ticked; there is no timer anywhere. |
| CNV-002 explainability | The result page recomputes from stored answers and renders the inputs, the reason each mattered, the rule version, and an uncertainty notice — on every category, not only the uncertain one. |
| CNV-001 save and resume | No account. Resume token is 32 random bytes; only its SHA-256 hash is stored, so a database disclosure yields no working links. Email capture requires its own ticked consent, enforced by a database constraint as well as by the form. |
| PUB-005 human path | `/[locale]/contact` is linked from the qualifier start page, every question page, and the header. It asks for nothing before showing phone, email, relay and accommodation routes. |
| ARC-006 no-JavaScript | A dedicated Playwright project completes the **entire eight-question qualifier** and records a consent decision with scripting disabled. Every step is a plain form POST. |
| PUB-001 bilingual | Full EN/FR for the qualifier, result and contact pages. A unit test fails if any product string lacks a French translation. |
| Q-21 no conclusions | `assertNoConclusion` rejects compliance vocabulary, and a unit test runs all 144 reachable rule permutations through it. An end-to-end test asserts the rendered result page contains none of the forbidden phrases. |

### Decisions taken during the build

1. **The qualifier prefers caution over a sales-ready category.** Any "not sure" answer routes to a human, even when every other signal points to a good assessment lead. Routing an uncertain case to an automated recommendation is the §25 regulatory-misstatement risk; routing a good lead to a conversation costs a phone call.
2. **`official_source_opened` is a headline metric, not a leak.** The result page offers the free official route as a first-class link and measures the click. Hiding it would be a dark pattern and would also destroy the Gate 0 signal that tests the core commercial hypothesis.
3. **The redirect to the official source resolves its URL from the claim, never from the form.** A caller-supplied redirect target is an open redirect, which on a trust-selling site is worse than the usual phishing risk.
4. **`@northstar/db` was split into `.` and `./admin`.** The migration runner reads the filesystem and the reset drops schemas; neither belongs in a bundle that serves requests, and neither should be reachable by autocomplete from application code.
5. **A seventh guard was added** (`analytics-consent`): no third-party script host anywhere in the app, no analytics globals, and `Analytics` constructible in exactly one file — the consent wrapper. Negative-tested in both directions.

### Deliberately not done in CC-02, and why

| Item | Reason | Lands in |
|---|---|---|
| Homepage marketing modules (hero, offers, method, trust layer, case narratives, resources) | CC-02's requirement focus is the conversion *system*. The marketing surface needs brand, commissioned photography and counsel-reviewed copy (Q-04, ORG-005), none of which exist. | CC-02b / Phase 1 |
| Sector and employee-band **content** personalization (PUB-002 beyond the qualifier) | The band is captured and persisted; there is no sector content to switch between yet. | With the marketing pages |
| Actually sending the resume email | The email adapter is a fake until Q-14 picks a vendor. The consented address is recorded and the screen says so rather than claiming a send that did not happen. | CC-03 |
| Checkout and booking (PUB-003) | CC-03's slice. | CC-03 |
| Manual screen-reader pass and the prototype panel session (ACC-010) | Now overdue: CC-02 is the first slice with a real user task. **This is a CC-02 exit criterion that has not been met**, and no accessibility claim should be made until it is. | Before CC-03 |
| Core Web Vitals field measurement (ARC-005) | Lab budgets only so far; there is no traffic to measure. | CC-09 |

---

## 7. CC-02 hardening pass

Not a new slice — closing the gaps the CC-02 record itself declared, before
adding more surface. **270 unit/integration tests, 129 Playwright tests, 7 guards.**

| Item | Requirement | What landed |
|---|---|---|
| Rate limiting | Q-27, §16 Assurance | Fixed-window limiter on all four anonymous actions, failing closed. Keys are a daily-rotating HMAC of the client address, so no raw address is stored and counters cannot be correlated across days. Pruned by the retention sweep. |
| Accessible refusal | ACC-005, ACC-006 | An ordinary page with a heading, a wait time and a link to a person. An `@a11y` test fails if the word "captcha" ever appears on it. |
| Content-Security-Policy | SEC-001, ARC-007 | Nonce-based with `strict-dynamic`; `connect-src 'self'` means no third-party origin is reachable at all. Tested for the header *and* for the absence of violations while using the qualifier. |
| Open-redirect fix | SEC-001 | The consent form's return path is validated as a locale route with no backslash or colon, not merely prefix-checked. |

### What this pass taught us

The first rate limits were wrong in a way that testing caught and code review
would not have: they were sized for one person, and the buyers here are
organizations whose staff share one NAT address. A limit that locks out a client
because two colleagues compared notes is worse than no limit — it fails exactly
the users the product is trying to serve. The limits are now sized against the
false-positive case.

The same lesson applied to the tests themselves: rate-limit counters persist in
hourly windows, so a second suite run inside the same hour inherited the first
run's consumed budget and failed in a way that looked like a product bug. Both
the database tests and the Playwright projects now use per-run client
identifiers.

---

## 8. CC-02b — public marketing surface

The homepage §7 asks for, and a visual system to carry it. **283 unit/integration
tests, 159 Playwright tests, 7 guards.**

| Module (PRD §7) | State |
|---|---|
| Source-stamped notice band | Done — renders the regulatory claim through the content model, dismissible, no motion. Shows the hold state, because the seeded claim is unreviewed (Q-04). |
| Hero | Done — one promise, one primary CTA, one secondary, plus three control facts that are each an enforced policy rather than a marketing claim. |
| Employee-size selector | Done (PUB-002) — persists as a functional preference, annotates rather than hides, works without JavaScript. |
| Offer architecture | Done — outcome, inclusions, indicative price, timing, required inputs **and exclusions** for all five offers. |
| Method | Done — four stages as an ordered list, no motion at all. |
| Trust layer | Done, as *policies*. See below. |
| Case narratives | **Deliberately empty.** |
| Editorial resources | Not built — needs real articles. |
| Final CTA | Done, with the human path at equal weight. |

### Two things not faked, on purpose

§7 asks for named leadership, credential policy, sample report excerpts and
before/after case narratives. None of those people or engagements exist yet.

- The **trust layer** states the policies the PRD commits to — every conclusion
  signed by a named reviewer, specialists verified and calibrated, evidence
  scanned and scope-limited, a paid disability panel, and an explicit statement
  of what the service is not. Each is enforced somewhere in this codebase, which
  is why it can be asserted publicly.
- The **proof section** is an honest empty state saying case narratives are not
  published yet and offering a redacted sample on request. Inventing testimonials
  on a site whose entire proposition is trustworthiness would have destroyed the
  only asset the business has. An e2e test asserts the empty state is present.

Likewise no photography: §14 warns against tokenistic stock and AI-perfect
imagery, so the art direction is typographic — a display serif, a faint
structural grid behind the hero, hairline rules instead of cards. Real
commissioned photography replaces it.

### Design system

- Display serif (Newsreader) paired with a grotesque (Inter), both **self-hosted
  at build time** via `next/font`. No font-CDN request at runtime, so `font-src`
  stays `'self'`, the no-third-party guard stays honest, and a visitor's address
  is never disclosed to a font host before they consent to anything.
- Every new colour pair is contrast-tested. The token set grew from 20 asserted
  pairs to 27.
- One correction found by the tests: `border-subtle` was listed as a meaningful
  boundary and fails 3:1. It is a decorative hairline; a test now pins that and
  says so, so it can never become the only marker of a control.
