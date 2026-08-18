---
document: Product Requirements Document
project: Project Northstar
version: 1.0
status: build-ready-after-validation
budget_cad: 5000000
primary_agent: Claude Code
source_of_truth: true
---

# Claude Code build directive

Read this document in full before changing code. Treat its requirement IDs, acceptance criteria, release gates, accessibility requirements, security controls and commercial boundaries as binding. If an implementation decision is missing, write an Architecture Decision Record and surface the trade-off. Do not silently weaken a requirement.

Begin with the “First Claude Code prompt” in Section 27. Do not scaffold or implement the entire platform in one pass. Deliver the CC-01 through CC-09 vertical slices only after approval at the relevant gate.

**PROJECT NORTHSTAR**

AODA Readiness  
Platform

Product Requirements Document for a premium, contractor-powered accessibility business

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>EXECUTIVE MANDATE</strong></p>
<p>Build Ontario’s most trusted, accessible and operationally rigorous platform for AODA readiness—combining a high-conversion public experience with secure client delivery, qualified specialist coordination and evidence-led remediation.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>CA$5.0M</strong></p>
<p>approved programme envelope</p></th>
<th><p><strong>12–15 mo</strong></p>
<p>target delivery horizon</p></th>
<th><p><strong>WCAG 2.2 AA</strong></p>
<p>product accessibility target</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Version**       | 1.0                                                                      |
|-------------------|--------------------------------------------------------------------------|
| **Date**          | August 18, 2026                                                          |
| **Status**        | Build-ready strategic specification; capital release gated by validation |
| **Working title** | Project Northstar — not trademark-cleared                                |

Commercial and product specification—not legal advice. Client organizations retain responsibility for representations, certification and submission to government.

# Contents

[<u>1. Executive decision</u>](#executive-decision)

[<u>2. Opportunity and regulatory context</u>](#opportunity-and-regulatory-context)

[<u>3. Product vision, principles and boundaries</u>](#product-vision-principles-and-boundaries)

[<u>4. Audience and jobs to be done</u>](#audience-and-jobs-to-be-done)

[<u>5. Commercial model and offer architecture</u>](#commercial-model-and-offer-architecture)

[<u>6. Experience and service blueprint</u>](#experience-and-service-blueprint)

[<u>7. Public website requirements</u>](#public-website-requirements)

[<u>8. Qualification and conversion system</u>](#qualification-and-conversion-system)

[<u>9. Client portal requirements</u>](#client-portal-requirements)

[<u>10. Contractor portal requirements</u>](#contractor-portal-requirements)

[<u>11. Internal operations console</u>](#internal-operations-console)

[<u>12. AI-assisted capabilities and safeguards</u>](#ai-assisted-capabilities-and-safeguards)

[<u>13. Information architecture and content</u>](#information-architecture-and-content)

[<u>14. Brand, interface and motion direction</u>](#brand-interface-and-motion-direction)

[<u>15. Accessibility requirements</u>](#accessibility-requirements)

[<u>16. Security, privacy and resilience</u>](#security-privacy-and-resilience)

[<u>17. Technology and integration architecture</u>](#technology-and-integration-architecture)

[<u>18. Data model and permissions</u>](#data-model-and-permissions)

[<u>19. Analytics, KPIs and experimentation</u>](#analytics-kpis-and-experimentation)

[<u>20. Roadmap, governance and release gates</u>](#roadmap-governance-and-release-gates)

[<u>21. Team and operating model</u>](#team-and-operating-model)

[<u>22. CA\$5 million budget</u>](#ca5-million-budget)

[<u>23. Go-to-market and launch</u>](#go-to-market-and-launch)

[<u>24. Quality assurance and acceptance</u>](#quality-assurance-and-acceptance)

[<u>25. Risks and mitigations</u>](#risks-and-mitigations)

[<u>26. Source notes, glossary and disclaimers</u>](#source-notes-glossary-and-disclaimers)

[<u>27. Claude Code implementation contract</u>](#claude-code-implementation-contract)

# 1. Executive decision

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>DECISION</strong></p>
<p>Proceed with a six-week paid-validation gate, then release capital in stages. Do not commit the full CA$5 million until demand, willingness to pay and contractor unit economics meet the thresholds in this PRD.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Project Northstar is a premium digital business for Ontario organizations that need to understand, organize and execute accessibility-readiness work. It is not a form-filing shop and it must never imply government affiliation. Its advantage is a coordinated operating system: clear qualification, expert-led assessment, secure evidence handling, prioritized remediation, retesting and executive-ready records.

The public website is the demand engine. The client portal is the trust and retention engine. The contractor platform is the capacity engine. The internal console is the margin and quality engine. Together, they create a scalable service platform that can be run by a small leadership team while qualified specialists deliver regulated and technical work under controlled scopes.

## Success at a glance

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>20+</strong></p>
<p>paid readiness assessments before Gate 2</p></th>
<th><p><strong>≥25%</strong></p>
<p>qualified-call to paid conversion target</p></th>
<th><p><strong>≥50%</strong></p>
<p>assessment to core-upgrade target</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

- Own the brand, demand generation, intake, project orchestration, quality gates and client relationship.

- Outsource qualified manual audits, remediation, accessible-document work and specialist advisory deliverables under standard scopes.

- Target Ontario organizations with 50–199 employees first, then expand by vertical and geography only after repeatable delivery.

- Position around evidence-led readiness and remediation—not fear, overlays, automatic certification or penalty guarantees.

- Build bilingual English/French capability from day one so the architecture, content model and support processes do not require later rework.

## North-star outcome

A decision-maker should move from uncertainty to a credible, board-ready action plan in days—not weeks—while every technical conclusion remains traceable to qualified human review.

# 2. Opportunity and regulatory context

Ontario’s 2026 reporting cycle creates urgency, but the durable business is broader than a deadline. Organizations need accessible policies, websites, documents, training, procurement practices and evidence that can survive internal review. The platform will use the deadline as an acquisition catalyst while selling a repeatable readiness and remediation system.

| **Signal**                                                                          | **Product implication**                                                                                                     | **Commercial response**                                                                                               |
|-------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| 20+ employees: accessibility compliance reporting deadline is December 31, 2026     | Qualification must capture employee count, organization type and last report status.                                        | Deadline-specific readiness sprint; never claim that the platform replaces client certification.                      |
| 50+ employees: public website accessibility requirements generally apply            | Website audit path should appear only when relevant and should separate automated scans from manual conformance evaluation. | Higher-value digital-readiness and remediation-management offers.                                                     |
| Government reporting support and forms are available without a private intermediary | Commodity filing assistance is not a defensible core offer.                                                                 | Sell evidence review, gap closure, audit, prioritization and executive sign-off preparation.                          |
| Ontario’s current regulation references WCAG 2.0 Level AA                           | The legal-baseline matrix must be versioned and reviewed by counsel or qualified policy specialists.                        | Build to WCAG 2.2 AA as the product quality target, with a clear distinction from the current Ontario legal baseline. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>COMMERCIAL TRUTH</strong></p>
<p>The strongest conversion message is not “we file your form.” It is “we organize the evidence, identify the gaps, coordinate qualified remediation and leave your authorized signer with a defensible decision pack.”</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Initial beachhead

- Private schools and education operators with distributed documents and decentralized web publishing.

- Multi-location childcare, home-care and clinic groups with operational urgency and varied vendor systems.

- Nonprofits and associations with board oversight, grant obligations and limited internal accessibility capacity.

- Professional-services firms with 50–199 employees, client-facing websites and reputational sensitivity.

## Validation questions

1.  Will the buyer pay CA\$495 for a time-bound readiness assessment without a guarantee of compliance?

2.  Which evidence gaps most often trigger a core engagement: website, documents, training, policy or record-keeping?

3.  Can vetted contractors deliver fixed scopes at gross margins compatible with premium client care?

4.  Which trust signals materially change conversion: credentialed experts, sample reports, lived-experience testing, insurance or case studies?

# 3. Product vision, principles and boundaries

## Vision

Make accessibility readiness feel understandable, credible and achievable—without trivializing the work or turning disability into a fear-based sales device.

## Product principles

| **Principle**                    | **How it appears in the product**                                                                                                              |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Trust before urgency             | Deadlines are accurate and visible, but the interface avoids countdown panic, dark patterns and manufactured scarcity.                         |
| Human expertise is explicit      | Every audit conclusion, legal-baseline interpretation and remediation sign-off shows the responsible qualified reviewer.                       |
| Accessible by construction       | Accessibility is embedded in design tokens, components, content workflows, QA and procurement—not appended at launch.                          |
| Progress over perfection theatre | The product reveals prioritized actions, owners, status and evidence rather than a simplistic pass/fail badge.                                 |
| Premium means calm               | Clear hierarchy, editorial photography, generous space, disciplined motion and plain language replace generic SaaS gradients and visual noise. |
| Minimum necessary data           | Collect only what is needed, make retention visible and allow organization-controlled deletion/export.                                         |

## Goals

- Create a credible acquisition-to-delivery experience that supports a six-figure service business before requiring enterprise scale.

- Reduce assessment setup time, contractor coordination time and report assembly time through structured workflows.

- Give clients a single source of truth for obligations, evidence, issues, decisions, deliverables and progress.

- Protect the business with strong scope boundaries, audit trails, versioned requirements and human approval gates.

## Non-goals

- No claim of government authorization, certification or guaranteed legal compliance.

- No accessibility overlay or automated widget presented as a substitute for accessible source code and content.

- No automated submission to government in the first release.

- No open marketplace where unvetted contractors compete publicly on price.

- No general-purpose legal-advice chatbot.

# 4. Audience and jobs to be done

| **Persona**           | **Primary job**                                              | **Anxiety**                                                  | **What earns trust**                                                            |
|-----------------------|--------------------------------------------------------------|--------------------------------------------------------------|---------------------------------------------------------------------------------|
| Executive sponsor     | Understand exposure, approve spend and sign with confidence. | Personal accountability, reputation, unclear status.         | Executive summary, named reviewers, evidence trail, cost and timeline clarity.  |
| Operations / HR lead  | Collect policies, training records and operational evidence. | Scattered files, ambiguous ownership, competing deadlines.   | Guided checklist, reminders, templates, clear owners and due dates.             |
| Web / IT lead         | Convert audit findings into implementable fixes.             | Vague tickets, false positives, regressions.                 | Reproduction steps, code-level guidance, severity rationale, retest status.     |
| Contract auditor      | Deliver expert work without administrative friction.         | Scope creep, missing evidence, delayed approvals or payment. | Complete brief, secure workspace, fixed acceptance criteria and fast decisions. |
| Internal project lead | Route work, preserve margin and maintain quality.            | Capacity bottlenecks, missed handoffs, inconsistent reports. | Risk dashboard, templates, QA gates, capacity view and audit logs.              |

## Priority jobs to be done

- When a reporting or executive deadline approaches, help me determine what applies and what evidence is missing so I can act without guessing.

- When an audit finds issues, give my team clear, prioritized instructions and access to qualified help so we can close risk efficiently.

- When I must brief leadership, give me a concise, traceable status pack so decisions and representations are defensible.

- When I assign specialist work, show only the minimum client information required and make the acceptance standard unambiguous.

## Accessibility-inclusive research panel

Recruit and pay a standing panel of people with diverse disabilities and assistive-technology experience. Include blind and low-vision users, keyboard-only users, Deaf and hard-of-hearing users, people with mobility disabilities, neurodivergent users and users with cognitive or learning disabilities. Participation must be compensated, optional and supported with accessible research materials.

# 5. Commercial model and offer architecture

The offer ladder is designed to convert uncertainty into a scoped engagement, then expand through visible evidence—not pressure. Prices below are launch hypotheses in Canadian dollars and must be tested against contractor wholesale rates and buyer willingness to pay.

| **Offer**                      | **Indicative price** | **Includes**                                                                                     | **Primary conversion job**                        |
|--------------------------------|----------------------|--------------------------------------------------------------------------------------------------|---------------------------------------------------|
| 2026 AODA Readiness Assessment | CA\$495              | Structured intake, 60-minute review, evidence snapshot, priority map and recommended next scope. | Turn deadline concern into a paid diagnosis.      |
| Core Readiness Package         | CA\$2,000–3,000      | Policy/evidence review, requirements matrix, action register and executive summary.              | Close document, training and record-keeping gaps. |
| Digital Readiness Package      | CA\$4,500–7,500      | Manual sample audit, prioritized issue register, remediation workshop and retest allowance.      | Create an actionable path for web teams.          |
| Remediation Management         | Custom               | Specialist sourcing, project management, QA, change control and verified handoff.                | Remove coordination burden from the client.       |
| Accessibility Care Plan        | CA\$399–799/mo       | Scheduled checks, content support, policy refresh, training reminders and reporting dashboard.   | Create recurrence and reduce regression risk.     |

## Unit economics guardrails

- Target blended gross margin of at least 55% after contractor costs, payment fees and direct software usage.

- No fixed client price without a matching contractor scope, acceptance criteria and revision allowance.

- Assessment delivery target: no more than 2.5 internal hours plus qualified specialist review when required.

- Core packages require 50% deposit; contractor work begins only after cleared funds and signed scope.

- Change orders are generated inside the portal and must be accepted before out-of-scope work starts.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>MANDATORY WORDING</strong></p>
<p>Use “readiness,” “assessment,” “review,” “qualified audit” and “remediation support.” Avoid “certified compliant,” “government approved,” “guaranteed protection,” or any copy implying that payment transfers the client’s legal responsibility.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 6. Experience and service blueprint

| **Stage** | **Client experience**                                                       | **Behind the scenes**                                               | **Control point**                                        |
|-----------|-----------------------------------------------------------------------------|---------------------------------------------------------------------|----------------------------------------------------------|
| Discover  | Find deadline or sector resource; understand relevance in under 60 seconds. | CMS content mapped to sector, employee band and intent.             | Sources and effective dates displayed.                   |
| Qualify   | Answer 6–10 plain-language questions; receive a useful next step.           | Rules engine classifies pathway without issuing a legal conclusion. | Uncertain cases routed to human review.                  |
| Purchase  | Choose a scoped assessment, schedule and pay securely.                      | CRM record, project shell, invoice and task template created.       | Scope, cancellation and privacy consent logged.          |
| Intake    | Invite collaborators, upload evidence and complete guided checklist.        | Files scanned, classified and access-scoped.                        | Minimum necessary access; full audit trail.              |
| Assess    | Track progress and answer targeted requests.                                | Qualified contractor performs review in controlled workspace.       | Second-person QA for high-risk deliverables.             |
| Decide    | Review findings, priorities, owners, budget ranges and next options.        | Internal PM approves language, evidence and recommendations.        | No report released with unresolved QA exceptions.        |
| Remediate | Approve work, monitor tasks and receive retest results.                     | Specialists are matched by skill, availability and conflict status. | Changes require client approval and acceptance evidence. |
| Maintain  | Receive scheduled prompts and a living readiness dashboard.                 | Recurring checks and content workflows prevent regression.          | Renewal depends on demonstrated value, not lock-in.      |

## Service promise

Every engagement must answer five questions: what appears to apply, what evidence exists, what is missing, what should happen next and who is accountable. The platform should never collapse uncertainty into a misleading green score.

## Standard contractor roles

- Ontario accessibility consultant for requirements interpretation, policy and organizational-practice review.

- IAAP-certified or equivalently experienced manual accessibility auditor for web and application work.

- Front-end remediation developer for semantic, keyboard, screen-reader and visual-accessibility fixes.

- Accessible-document specialist for tagged PDF, Office document and template remediation.

- Project assistant for evidence normalization, scheduling and approved administrative steps.

# 7. Public website requirements

The site must feel like a premium Canadian professional-services brand with the utility of a product. It should make the next step obvious without flattening accessibility into marketing theatre.

## Homepage composition

| **Module**                 | **Requirement**                                                                                                                                                           | **Conversion purpose**                         |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| Source-stamped notice band | Display the 2026 deadline with a visible source link and last-reviewed date. Must be dismissible and must not flash or auto-scroll.                                       | Create accurate relevance without panic.       |
| Hero                       | One clear promise, one primary CTA (“Check your readiness”) and one secondary CTA (“See how delivery works”). Use real, commissioned imagery or restrained art direction. | Orient within 10 seconds.                      |
| Employee-size selector     | Let visitors choose \<20, 20–49, 50–199 or 200+ employees and organization type.                                                                                          | Personalize requirements and proof.            |
| Readiness qualifier        | 6–10 questions, progress indicator, save-and-resume, accessible validation and a useful on-screen result.                                                                 | Convert high-intent visitors.                  |
| Offer architecture         | Show outcome, inclusions, indicative price, timing, required client inputs and exclusions.                                                                                | Reduce sales friction and mismatched leads.    |
| Method                     | Visual four-stage path: Understand, Evidence, Remediate, Maintain. All motion optional.                                                                                   | Demystify contractor-powered delivery.         |
| Trust layer                | Named leadership, specialist credential policy, insurance posture, secure handling, paid lived-experience testing and sample report excerpts.                             | Substantiate expertise.                        |
| Case narratives            | Before/after operational stories with constraints, actions and measured outcomes; no anonymous vanity quotes without context.                                             | Provide decision evidence.                     |
| Editorial resources        | Sector guides, deadline updates, procurement templates, explainers and webinar recordings with transcripts.                                                               | Build search demand and retargeting audiences. |
| Final CTA                  | Assessment purchase, consultation booking and accessible contact alternatives.                                                                                            | Give buyers control over the next step.        |

## Public functional requirements

| **ID**  | **Requirement**                                          | **Acceptance criterion**                                                                                                       |
|---------|----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| PUB-001 | Responsive, bilingual, CMS-managed marketing experience. | All core pages can be published in English and French without developer intervention; missing translation states are explicit. |
| PUB-002 | Sector and employee-band personalization.                | Selected profile persists with consent and changes relevant copy, content and CTA without hiding the general site.             |
| PUB-003 | Accessible booking and checkout.                         | Keyboard and screen-reader users can select service, time and payment method with no third-party accessibility blocker.        |
| PUB-004 | Evidence-backed content.                                 | Regulatory claims include source URL, effective date, jurisdiction and content-owner review date.                              |
| PUB-005 | Fast path to human help.                                 | A visitor can request phone, email or relay-friendly contact without completing the qualifier.                                 |
| PUB-006 | Consent-aware analytics.                                 | Non-essential analytics do not load before valid consent; opt-out is persistent and equivalent service remains available.      |

# 8. Qualification and conversion system

The qualifier is a guided routing tool, not a legal determination. Its job is to create value before the sales call, identify obvious misfit, capture consented context and recommend a transparent next step.

## Question domains

- Ontario presence, organization type, employee-count band and relevant reporting history.

- Public website ownership, major platforms, recent redesigns and known accessibility work.

- Policies, training, feedback process, accessible formats and evidence availability.

- Deadline, executive sponsor, budget range, procurement constraints and preferred support channel.

- Need for accessible documents, web audit, remediation, training, policy or project management.

## Routing logic

| **Result**               | **User-facing output**                                                               | **Internal action**                                               |
|--------------------------|--------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| Likely self-serve        | Relevant official links, plain-language checklist and optional newsletter.           | Tag as nurture; no aggressive follow-up.                          |
| Readiness assessment fit | Gap themes, assessment scope, transparent CA\$495 price and booking options.         | Create qualified lead; show capacity and priority score.          |
| Direct specialist fit    | Explanation that manual audit or document remediation is the appropriate first step. | Route to estimator and specialist review before quoting.          |
| Uncertain / high-risk    | State that more context is required; offer a no-pressure human review.               | Escalate to qualified internal reviewer; no automated conclusion. |

## Conversion requirements

| **ID**  | **Requirement**                                                     | **Acceptance criterion**                                                                                                         |
|---------|---------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| CNV-001 | Save-and-resume without mandatory account creation at question one. | User may receive a secure magic link after explicit consent; abandoned data follows a short retention schedule.                  |
| CNV-002 | Result explainability.                                              | Every recommendation shows the inputs and rule category that produced it, plus an uncertainty notice.                            |
| CNV-003 | No dark patterns.                                                   | No preselected paid add-ons, false scarcity, disguised advertising, shame copy or inaccessible urgency timers.                   |
| CNV-004 | Sales handoff context.                                              | CRM receives consent status, profile, result, source, content history and requested accommodation—never unneeded sensitive data. |

# 9. Client portal requirements

The client portal is a secure project room and evidence system. It must reduce ambiguity, show progress and make accountability visible without exposing internal contractor economics or unrelated tenant data.

| **Domain**           | **Required capability**                                                                                | **Release** |
|----------------------|--------------------------------------------------------------------------------------------------------|-------------|
| Identity             | Organization invitations, MFA, role management, session controls, account recovery and admin transfer. | MVP         |
| Organization profile | Entity type, locations, employee band, sector, websites, systems, deadlines and authorized signer.     | MVP         |
| Guided intake        | Dynamic checklist, autosave, accessible validation, dependencies and completion estimate.              | MVP         |
| Evidence vault       | Secure uploads, malware scan, versioning, labels, retention, preview and downloadable originals.       | MVP         |
| Requirements matrix  | Versioned requirement, applicability state, evidence link, owner, reviewer, rationale and review date. | MVP         |
| Issue register       | Severity, impact, reproduction, affected users, owner, due date, status, evidence and retest history.  | MVP         |
| Work plan            | Tasks, milestones, dependencies, comments, approvals and controlled contractor visibility.             | MVP         |
| Commercial           | Scope, e-signature, deposits, invoices, payment status, change orders and renewal options.             | MVP         |
| Reports              | Accessible HTML and tagged-PDF deliverables, executive summary, appendices and version history.        | MVP         |
| Notifications        | In-app and email preferences, digest option, escalation rules and accessible message templates.        | MVP         |
| Care plan            | Recurring checks, content-review queue, training reminders and regression trends.                      | Phase 4     |
| Data controls        | Export, retention schedule, deletion request, consent record and audit-log access.                     | MVP         |

## Portal acceptance requirements

- A client administrator can invite an operations lead and web lead with different permissions and revoke access immediately.

- Every finding can be traced to evidence, reviewer, requirement version and retest state.

- A client can download an accessible executive package without requesting manual assembly from staff.

- A user can complete all core tasks with keyboard only, at 400% zoom and using supported screen readers.

- The product never labels the organization “compliant” based solely on automated checks or incomplete evidence.

# 10. Contractor portal requirements

The specialist network is curated, not open. Contractors receive least-privilege access to scoped assignments and are measured on quality, communication, timeliness and revision rate—not simply speed or price.

| **ID**  | **Requirement**                  | **Acceptance criterion**                                                                                                                 |
|---------|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| CTR-001 | Credential and practice profile. | Store credential type, verification source/date, sample-report review, domains, languages, insurance expiry and conflicts.               |
| CTR-002 | Capacity and availability.       | Contractor can declare weekly capacity, blackout dates, turnaround and maximum concurrent work.                                          |
| CTR-003 | Structured assignment brief.     | Every assignment includes scope, inputs, exclusions, deliverables, dates, rate, revision allowance and acceptance rubric.                |
| CTR-004 | Scoped data access.              | Contractor sees only assigned clients, files, issues and messages; access expires automatically after closure.                           |
| CTR-005 | QA and revision workflow.        | Submission cannot be marked complete until required checks, peer review and client-facing language QA pass.                              |
| CTR-006 | Financial visibility.            | Contractor sees approved fee, invoice status, payment date and disputed items—never client retail pricing unless contractually required. |
| CTR-007 | Performance record.              | Internal scorecard tracks on-time delivery, acceptance-first-pass, revision rate and substantiated client feedback.                      |

## Network admission standard

- Verify identity, business registration where applicable, references, confidentiality terms and professional insurance appropriate to scope.

- For accessibility auditors, verify IAAP credentials or equivalent demonstrable experience and review a redacted sample report for manual-testing depth.

- Require a paid calibration assignment before access to live client work.

- Document conflicts, subcontracting rules, AI-use policy, secure-device expectations and breach-notification duties.

- Suspend assignment eligibility automatically when required credentials or insurance expire.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>QUALITY RULE</strong></p>
<p>No contractor deliverable goes directly to a client without an internal release gate. High-risk conclusions require a named qualified reviewer and second-person quality check.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 11. Internal operations console

| **Workspace**        | **Core functions**                                                                                             | **Decision supported**                                    |
|----------------------|----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| Revenue cockpit      | Lead source, qualification result, pipeline stage, proposal value, probability, aging and next action.         | Where should sales attention go today?                    |
| Delivery board       | Portfolio milestones, blocked tasks, evidence requests, due dates, QA state and client sentiment.              | Which engagement is at risk?                              |
| Capacity planner     | Contractor skills, availability, utilization, turnaround, conflicts and performance.                           | Who can accept this scope without lowering quality?       |
| Scope builder        | Reusable packages, assumptions, exclusions, wholesale rates, margin, revisions and change orders.              | Is this engagement profitable and controlled?             |
| Requirements library | Versioned source, jurisdiction, interpretation note, reviewer, effective date and affected templates.          | Which client artefacts must be updated when rules change? |
| QA centre            | Rubrics, exceptions, peer review, accessibility checks and release authorization.                              | Is this deliverable safe to release?                      |
| Content desk         | Bilingual editorial calendar, source review, legal review, expiry alerts and structured data.                  | What can be published and when should it be revalidated?  |
| Risk & incident      | Privacy incidents, service complaints, conflicts, overdue credentials, security alerts and corrective actions. | What requires executive intervention?                     |

## Operational automations

- Create project shell, standard tasks and evidence checklist after payment and agreement completion.

- Alert when client inputs threaten the committed timeline or when contractor capacity falls below threshold.

- Prevent client release while critical QA exceptions, missing reviewer identity or expired sources remain.

- Generate accessible status digests in the client’s preferred language and channel.

- Flag margin leakage when time, revisions or contractor cost exceed scope assumptions.

# 12. AI-assisted capabilities and safeguards

AI may accelerate classification, drafting and synthesis, but it cannot replace qualified professional judgment. All AI-assisted outputs must be attributable, reviewable and reversible.

| **Capability**      | **Permitted use**                                                          | **Human control**                                               | **Prohibited use**                                                            |
|---------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------|-------------------------------------------------------------------------------|
| Readiness triage    | Summarize intake themes and suggest a routing category.                    | Staff confirms before sales action.                             | Issuing a legal determination or compliance status.                           |
| Document classifier | Identify likely policy, training record, report or evidence type.          | User confirms labels; original is preserved.                    | Inferring sensitive traits unrelated to delivery.                             |
| Issue explainer     | Convert technical findings into plain-language impact summaries.           | Auditor approves technical accuracy and affected-user language. | Inventing impact, success criteria or evidence.                               |
| Remediation draft   | Suggest ticket wording, acceptance checks and code patterns.               | Developer/auditor reviews before assignment.                    | Automatically changing a client production system.                            |
| Contractor matching | Rank candidates by verified skill, capacity, language and conflict status. | Internal PM makes assignment and can inspect factors.           | Ranking on protected attributes or opaque behavioural scores.                 |
| Report assembly     | Populate approved template from structured, cited findings.                | Named reviewer signs off every released version.                | Fabricated citations, hidden source substitution or autonomous certification. |

## AI governance requirements

- Record model/provider, prompt-template version, input references, output, reviewer and disposition for material client-facing content.

- Use enterprise terms that prohibit training on client data; segregate tenants and sensitive workspaces.

- Provide an “AI not used” workflow for clients or documents requiring stricter handling.

- Redact or minimize personal and sensitive information before model processing wherever possible.

- Test for hallucination, inaccessible wording, bias, overconfidence, source mismatch and data leakage before release.

- Show uncertainty and source coverage; never disguise generated content as an independent expert review.

# 13. Information architecture and content

## Public sitemap

| **Level 1**     | **Key child pages / states**                                                                                     |
|-----------------|------------------------------------------------------------------------------------------------------------------|
| Home            | Personalized employee-band state; sector state; default general state.                                           |
| Check readiness | Qualifier, saved session, result, human-review escalation, purchase and booking.                                 |
| Services        | Readiness Assessment, Core Readiness, Digital Readiness, Remediation Management, Care Plan.                      |
| How it works    | Method, specialist network, quality controls, security, accessibility and client responsibilities.               |
| Industries      | Education, childcare, care providers, nonprofits/associations and professional services.                         |
| Resources       | 2026 reporting guide, website accessibility guide, evidence checklist, procurement guide, webinars and glossary. |
| Proof           | Case narratives, sample outputs, methodology notes, credentials policy and lived-experience programme.           |
| Company         | About, leadership, accessibility statement, privacy, terms, contact and complaints/feedback process.             |
| Portal          | Sign in, account recovery, service status and support.                                                           |

## Content model

- Every regulatory content object stores jurisdiction, source URL, effective date, last verified date, reviewer and next-review date.

- Every bilingual page stores translation status, translator/reviewer, source-language version and synchronization state.

- Every case narrative includes client context, constraint, scope, method, result, evidence and permission state.

- Every downloadable resource has HTML equivalent where practical and an accessibility QA record.

- Expired or disputed regulatory content automatically displays an internal hold and cannot be republished without review.

## SEO and discoverability

Use intent-led sector pages and useful tools rather than mass-produced keyword pages. Implement canonical URLs, hreflang, accessible structured data, descriptive titles, semantic headings, XML sitemaps and server-rendered critical content. Do not index personalized result pages or expose client information in URLs.

# 14. Brand, interface and motion direction

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>CREATIVE DIRECTION</strong></p>
<p>Premium Canadian trust with editorial restraint: deeply informed, warm and direct. The product should look commissioned and cared for—not assembled from a generic AI landing-page kit.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Layer**   | **Direction**                                                                                                                                         | **Avoid**                                                                                 |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Colour      | Deep ink \#0B2239, vivid teal \#00A6A6, white and black; use warm gold \#F0B44D sparingly for emphasis and status.                                    | Low-contrast pastels, rainbow accessibility clichés, colour-only status.                  |
| Typography  | Licensed premium humanist sans or neo-grotesk paired with robust system fallbacks; 16px minimum body; 70ch reading measure.                           | Tiny body copy, all-caps paragraphs, decorative scripts for functional content.           |
| Imagery     | Commissioned documentary photography of real work, real disabled professionals and tangible artefacts; obtain clear consent and descriptive alt text. | Tokenistic stock photography, AI-perfect hands/screens, disability-as-inspiration tropes. |
| Layout      | Editorial grid, generous spacing, strong typographic hierarchy, clear task panels and visible evidence metadata.                                      | Floating glass cards everywhere, excessive gradients, dense dashboard chrome.             |
| Iconography | Simple, consistent line/solid system with text labels for consequential actions.                                                                      | Unlabelled icons or accessibility symbols used as decoration.                             |
| Voice       | Calm, exact, plain-language and non-judgmental. State uncertainty and responsibility clearly.                                                         | Fear copy, vague superlatives, “effortless compliance,” invented statistics.              |

## Motion system

- Use purposeful microfeedback for selection, save, upload, progress and status changes; keep most transitions between 120–240 ms.

- Allow restrained scroll reveals only when content remains fully available without animation.

- No auto-advancing carousels, parallax that disrupts reading, flashing, infinite decorative motion or pointer-trailing effects.

- Respect prefers-reduced-motion and provide equivalent non-motion states; pause controls are required for any moving content that persists.

- Animate transforms and opacity where possible; motion cannot degrade Core Web Vitals or input responsiveness.

## Design-system deliverables

Tokens, type scale, spacing, elevation, grids, iconography, form patterns, content templates, data visualization rules, component states, empty/error/loading patterns, bilingual expansion rules, reduced-motion variants and an accessibility usage guide. Components cannot be released to production until their documented keyboard, focus, screen-reader, zoom and contrast behaviours pass.

# 15. Accessibility requirements

Target WCAG 2.2 Level AA across the public site, authenticated portals and generated client artefacts, even where the applicable Ontario legal baseline references an earlier WCAG version. This is a product-quality standard, not a statement about every client’s legal obligations.

| **Area**       | **Requirement / test coverage**                                                                                                   |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Keyboard       | All functionality without a pointer; visible focus; logical order; no trap; skip links; predictable shortcuts.                    |
| Screen readers | JAWS + Chrome/Edge, NVDA + Firefox/Chrome, VoiceOver + Safari, TalkBack + Chrome on agreed supported versions.                    |
| Visual         | Text and non-text contrast; 200% text resize; 400% zoom/reflow; Windows High Contrast; no colour-only meaning.                    |
| Motor / touch  | Adequate target sizes, spacing, alternative gestures, no drag-only interaction and generous timeouts with extensions.             |
| Cognitive      | Plain language, consistent navigation, visible progress, recoverable errors, no unnecessary memory burden and calm notifications. |
| Media          | Captions, transcripts, audio description strategy, no surprise playback and accessible media controls.                            |
| Documents      | Tagged PDFs/Office files, reading order, language, headings, lists, tables, links, alt text and accessible alternatives.          |
| Authentication | Accessible MFA, password manager support, paste allowed, alternative verification method and accessible recovery.                 |

## Testing model

- Automated checks in pull requests and design-system CI, understood as coverage aids rather than proof of conformance.

- Manual keyboard, screen-reader, zoom, contrast, responsive and content checks for every release candidate.

- Paid usability sessions with the standing disability panel at discovery, prototype, beta and pre-launch stages.

- Independent pre-launch audit by a qualified third party not responsible for primary implementation.

- Documented severity model, remediation owner, due date, retest evidence and exception approval.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>LAUNCH BLOCKER</strong></p>
<p>No severity-1 accessibility defects may remain open at launch. Severity-2 defects require an executive-approved, time-bound remediation plan and an accessible alternative that has been tested with affected users.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 16. Security, privacy and resilience

The portal will hold internal policies, employee training records, website findings, contracts and business-sensitive evidence. Security and privacy are product features and sales proof, not back-office checkboxes.

| **Control domain** | **Baseline requirement**                                                                                                                                      |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Security standard  | Design and verify against OWASP ASVS 5.0 Level 2; use the current OWASP Top 10 for awareness and secure-development training.                                 |
| Identity           | MFA for clients, contractors and staff; phishing-resistant option for privileged roles; SSO for higher tiers; device/session management.                      |
| Authorization      | Tenant isolation, RBAC, scoped project permissions, deny-by-default contractor access, periodic access review and immediate revocation.                       |
| Data protection    | TLS in transit, strong encryption at rest, managed keys/secrets, signed expiring download URLs, encrypted backups and data-residency review.                  |
| Uploads            | Malware scanning, type/size validation, quarantine, safe preview, content-disposition controls and prohibited executable formats.                             |
| Auditability       | Immutable security-relevant logs for sign-in, access, download, export, permission, report release, AI use and deletion actions.                              |
| Privacy            | Purpose limitation, data minimization, consent records, retention/deletion schedules, subprocessors register, privacy-impact assessment and request workflow. |
| Assurance          | Threat modeling, code review, dependency scanning, secret scanning, annual independent penetration test and remediation verification.                         |
| Resilience         | 99.95% portal availability objective; RPO ≤15 minutes; RTO ≤4 hours; tested restore and incident exercises at least annually.                                 |
| Incident response  | Defined severity, 24/7 critical escalation, evidence preservation, client communication templates and contractual notification commitments.                   |

## Privacy design decisions

- Do not collect disability or accommodation details unless needed to serve the user; when needed, restrict access and define a shorter retention period.

- Separate marketing consent from service communications and never make non-essential consent a condition of purchasing.

- Provide organization-level export, offboarding and verified deletion workflows with legal-hold handling.

- Publish a plain-language privacy summary and a detailed policy; both must identify subprocessors and contact routes.

# 17. Technology and integration architecture

This PRD is vendor-neutral. Technology selections must pass accessibility, security, data-residency, portability, total-cost and procurement reviews. A likely reference architecture follows.

| **Layer**            | **Responsibility**                                                                   | **Preferred characteristics**                                                                             |
|----------------------|--------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Experience           | Public site, qualifier, portals and internal console.                                | Modern server-rendered React/Next.js or equivalent; robust semantic HTML; progressive enhancement.        |
| Design system        | Tokens, components, documentation and automated checks.                              | Framework-agnostic standards; accessible components owned internally; no overlay dependency.              |
| Content              | Bilingual structured editorial and regulatory content.                               | Headless CMS with roles, approvals, localization, scheduled review and version history.                   |
| Application services | Workflows, permissions, projects, requirements, issues, approvals and notifications. | Modular domain services; idempotent jobs; clear audit events; API-first boundaries.                       |
| Data                 | Relational application data, search and reporting.                                   | Managed PostgreSQL or equivalent, row-level/tenant controls, encryption, PITR and tested migrations.      |
| Files                | Evidence and deliverables.                                                           | Canadian-region-capable object storage, malware pipeline, versioning, signed URLs and lifecycle rules.    |
| Identity             | Authentication, MFA, SSO, invitations and recovery.                                  | Standards-based managed identity with accessible hosted/custom flows and detailed audit logs.             |
| Integration          | CRM, billing, calendar, e-signature, email/SMS, support and accounting.              | Event-driven adapters, retries, dead-letter handling, consent-aware synchronization and vendor exit plan. |
| Observability        | Logs, metrics, traces, product analytics and alerting.                               | PII-aware instrumentation, SLO dashboards, anomaly alerting and accessible operational reports.           |

## Initial integration set

- CRM for lifecycle, consent, source and account history; payment processor for deposits, invoices and recurring care plans.

- Scheduling/calendar for accessible appointment selection and two-way availability sync.

- E-signature for scopes and change orders, subject to accessibility review and an equivalent supported process.

- Transactional email/SMS, support desk and accounting synchronization with clear system-of-record ownership.

- Government reporting links and guided handoff only in initial releases; no automated filing without explicit authorization and legal review.

## Performance objectives

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>≤2.5s</strong></p>
<p>LCP at p75</p></th>
<th><p><strong>≤200ms</strong></p>
<p>INP at p75</p></th>
<th><p><strong>≤0.1</strong></p>
<p>CLS at p75</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Targets apply separately to representative mobile and desktop populations. Critical public pages should render useful primary content without waiting for client-side JavaScript. Third-party scripts require a documented owner, purpose, consent category and performance budget.

# 18. Data model and permissions

## Core entities

| **Entity**   | **Key relationships / purpose**                                                                                     |
|--------------|---------------------------------------------------------------------------------------------------------------------|
| Organization | Owns users, locations, websites, subscriptions, projects, evidence and retention policy.                            |
| User         | Belongs to organization(s); has role, accessibility preferences, authentication and consent records.                |
| Project      | Connects service scope, client team, internal owner, contractor assignments, milestones, finances and deliverables. |
| Requirement  | Versioned source-backed statement with jurisdiction, applicability, review and linked evidence.                     |
| Evidence     | Versioned file/link/attestation with owner, classification, access policy, scan state and retention date.           |
| Finding      | Impact, severity, requirement mapping, reproduction, recommendation, owner, status and retest history.              |
| Assignment   | Contractor scope, access, fee, dates, inputs, deliverables, acceptance and payment status.                          |
| Deliverable  | Accessible report or artefact with version, authors, reviewers, approvals and client release state.                 |
| Audit event  | Actor, action, object, timestamp, context and tamper-evident retention.                                             |

## Role model

| **Role**           | **Typical permissions**                                                             | **Restrictions**                                                                 |
|--------------------|-------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| Client admin       | Manage organization profile, users, evidence, approvals, billing and exports.       | Cannot alter released findings or internal QA records.                           |
| Client contributor | Upload evidence, edit assigned tasks and comment.                                   | No billing, user administration or unrestricted exports.                         |
| Client executive   | Read dashboards, approve scopes/change orders and download executive reports.       | No contractor details or working notes unless explicitly shared.                 |
| Contractor         | Access assigned project inputs, submit work and respond to QA.                      | No other clients, retail pricing, unassigned evidence or final release control.  |
| Internal PM        | Manage projects, assignments, scope, client communications and release preparation. | Cannot override required independent review alone.                               |
| Qualified reviewer | Review findings, requirements interpretation and release-critical content.          | Cannot approve their own high-risk work where segregation is required.           |
| Platform admin     | Manage configuration and emergency access under logging.                            | No routine client-content access; break-glass access is time-bound and reviewed. |

# 19. Analytics, KPIs and experimentation

Measurement must connect acquisition quality to delivery quality and profitable retention. A conversion win that creates poor-fit work, inaccessible experiences or contractor overload is a product failure.

| **Layer**     | **Metric**                            | **Initial target / interpretation**                          |
|---------------|---------------------------------------|--------------------------------------------------------------|
| Demand        | Qualified organic and partner traffic | Grow by sector; exclude irrelevant deadline clicks.          |
| Activation    | Qualifier completion                  | ≥45% of starts; inspect accessibility and language drop-off. |
| Revenue       | Qualified call → paid assessment      | ≥25% after Gate 0.                                           |
| Expansion     | Assessment → core package             | ≥50% among recommended-fit clients.                          |
| Economics     | Blended gross margin                  | ≥55%; investigate scope or contractor variance.              |
| Delivery      | On-time milestone completion          | ≥90% excluding documented client-caused delays.              |
| Quality       | First-pass deliverable acceptance     | ≥85%; no critical factual or accessibility defect.           |
| Customer      | Decision confidence and effort        | Post-delivery confidence ≥8/10; effort trend downward.       |
| Accessibility | Critical defect escape                | Zero known severity-1 escapes; time-to-remediate tracked.    |
| Retention     | Care-plan renewal / expansion         | Cohort-based; do not optimize through cancellation friction. |

## Core event taxonomy

Track source_viewed, employee_band_selected, qualifier_started, qualifier_answered, qualifier_completed, result_viewed, official_source_opened, assessment_selected, booking_started, purchase_completed, evidence_requested, evidence_uploaded, finding_viewed, task_assigned, change_order_accepted, report_released, export_requested and support_contacted. Events must avoid raw document content and unnecessary personal data.

## Experiment guardrails

- Never test fear, shame, misleading deadlines, inaccessible variants or hidden costs.

- Define a primary metric, harm metrics and stopping rules before exposure.

- Stratify by device, language and assistive-technology signals only when privacy-safe and analytically appropriate.

- Do not personalize legal or regulatory claims without source-backed rule logic and qualified review.

# 20. Roadmap, governance and release gates

| **Phase**                   | **Timing**   | **Primary outputs**                                                                                                                       | **Capital / decision gate**                                                                  |
|-----------------------------|--------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| 0\. Paid validation         | Weeks 1–6    | 100 decision-maker interviews/contacts, 20 paid assessments, 5 core upgrades, contractor calibration, counsel review and prototype tests. | Release CA\$250k. Continue only if willingness-to-pay and delivery economics meet threshold. |
| 1\. Foundation              | Weeks 7–14   | Brand platform, service design, design system alpha, content model, architecture, security/privacy design and priority public pages.      | Cumulative CA\$1.50M.                                                                        |
| 2\. Public + client MVP     | Months 4–7   | Marketing site, qualifier, checkout, identity, intake, evidence, requirements, findings, reports, CRM and billing.                        | Release to controlled beta; cumulative CA\$3.25M after quality gate.                         |
| 3\. Contractor + operations | Months 7–10  | Contractor onboarding, assignments, QA, capacity, scope/margin tooling, incidents and full audit trail.                                   | Prove repeatable delivery at target margin.                                                  |
| 4\. Intelligence + content  | Months 9–12  | AI-assisted drafting with guardrails, advanced reporting, bilingual resource engine, care plans and partner workflows.                    | Cumulative CA\$4.25M.                                                                        |
| 5\. Launch + scale          | Months 12–15 | Independent audit, penetration test, performance hardening, campaigns, partner activation and support readiness.                          | Final CA\$750k; full envelope CA\$5.00M.                                                     |

## Gate 0 evidence threshold

- At least 20 paid assessments across three target verticals and five upgrades to a core package.

- At least 25% conversion from a qualified human conversation to paid assessment.

- Observed contractor capacity for the first 50 engagements and a calibrated wholesale rate card.

- A credible path to ≥55% blended gross margin without underpaying specialists or lowering QA.

- No unresolved legal, ethical, accessibility or security issue that invalidates the positioning or delivery model.

## Governance

A monthly steering committee owns capital release, risk acceptance and scope change. A weekly product-delivery council owns decisions and dependencies. Accessibility, privacy and security leads have formal stop-ship authority within their domains. Regulatory content changes follow a two-person review with source and effective-date capture.

# 21. Team and operating model

| **Capability**               | **Core / fractional**   | **Key accountability**                                                         |
|------------------------------|-------------------------|--------------------------------------------------------------------------------|
| Founder / CEO                | Core                    | Vision, partnerships, senior sales, capital and culture.                       |
| GM / COO                     | Core                    | Service operations, margin, contractor network and client outcomes.            |
| Product lead                 | Core                    | Roadmap, discovery, requirements, measurement and delivery.                    |
| Design lead + content design | Core                    | Brand system, service design, UX, content and design-system quality.           |
| Engineering lead + team      | Core / partner          | Architecture, implementation, security, performance and maintainability.       |
| Accessibility lead           | Core                    | Standards, testing, panel, component QA and release authority.                 |
| Security/privacy lead        | Fractional → core       | Threat model, privacy impact, vendor review, incident readiness and assurance. |
| Ontario AODA specialist      | Fractional / contractor | Requirements interpretation, templates, content and high-risk review.          |
| Contractor success manager   | Core                    | Recruitment, calibration, capacity, performance and payments.                  |
| Growth + partnerships        | Core                    | Sector acquisition, partner channel, lifecycle and ethical experimentation.    |
| Customer success             | Core                    | Onboarding, adoption, support, renewal and accessibility accommodations.       |

## Decision ownership

| **Decision**                            | **Accountable**    | **Required consultation**                                        |
|-----------------------------------------|--------------------|------------------------------------------------------------------|
| Regulatory claim or requirements change | AODA specialist    | Counsel, accessibility lead, content design.                     |
| Accessibility release exception         | Accessibility lead | Product, engineering, affected-user panel, executive sponsor.    |
| Security/privacy risk acceptance        | Executive sponsor  | Security/privacy lead, counsel, engineering.                     |
| Contractor admission/removal            | COO                | Accessibility lead, contractor success, project lead.            |
| Capital gate release                    | Steering committee | Finance, product, COO, accessibility and security/privacy leads. |

# 22. CA\$5 million budget

The budget funds a premium operating platform and launch—not just a brochure website. Amounts are programme envelopes and should be released through the gates in Section 20. Procurement must protect accessibility quality, source-code ownership, data portability and vendor exit.

| **Investment area**                        | **Budget**  | **Scope**                                                                                                     |
|--------------------------------------------|-------------|---------------------------------------------------------------------------------------------------------------|
| Brand strategy & research                  | \$300,000   | Positioning, customer research, naming/trademark work, brand identity and service proposition.                |
| Product/UX/design system                   | \$625,000   | Service design, UX, prototypes, content design, component library and bilingual patterns.                     |
| Public marketing website                   | \$675,000   | Premium responsive build, qualifier, resource engine, sector experiences, checkout and performance.           |
| Secure client portal + workflow            | \$1,050,000 | Identity, evidence, requirements, findings, plans, approvals, reports, payments and notifications.            |
| Contractor operations & QA                 | \$425,000   | Credentialing, assignment, capacity, least-privilege workspaces, QA and financial workflow.                   |
| Accessibility + lived-experience co-design | \$500,000   | Standing paid panel, specialist leadership, manual audits, accessible documents and remediation verification. |
| Content & media                            | \$350,000   | Bilingual editorial, commissioned photography/video, explainers, templates and production.                    |
| Data, analytics, CRM & integrations        | \$300,000   | Data platform, consent-aware analytics, CRM, billing, e-signature, support and accounting.                    |
| Security, privacy, legal & compliance      | \$275,000   | Counsel, privacy impact, threat model, penetration tests, contracts, insurance and incident readiness.        |
| Launch, growth & partnerships              | \$300,000   | Sector campaigns, partner enablement, events, lifecycle programmes and launch support.                        |
| Contingency & reserve                      | \$200,000   | Controlled reserve for validated risks; steering-committee approval required.                                 |

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>CA$5,000,000</strong></p>
<p>total programme envelope</p></th>
<th><p><strong>CA$250,000</strong></p>
<p>first validation release</p></th>
<th><p><strong>5 gates</strong></p>
<p>capital control points</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Budget controls

- Maintain a rolling forecast by workstream, committed spend, earned value, variance and forecast-to-complete.

- Require accessible design and engineering acceptance criteria in every procurement statement of work.

- Reserve at least 10% of vendor fees until source code, documentation, accessibility evidence and security findings are accepted.

- No contingency draw for routine scope growth; use it only for documented risks approved by the steering committee.

- Measure spend against activated clients, delivery throughput, quality, margin and retained capability—not asset volume alone.

# 23. Go-to-market and launch

## Positioning

For Ontario organizations that need a credible path through accessibility obligations and operational gaps, Project Northstar is the readiness and remediation partner that turns scattered evidence into a prioritized, expert-reviewed action plan. Unlike form-filing services or automated overlays, it combines transparent scope, qualified human review and secure project orchestration.

## Demand channels

| **Channel**           | **Launch motion**                                                                                                  | **Proof required**                                                                       |
|-----------------------|--------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Search / editorial    | Publish source-stamped 2026 guidance, employee-band explainers, evidence checklists and sector pages.              | Accuracy review, original value, accessible downloads and conversion attribution.        |
| Professional partners | Referral kits for HR consultants, web agencies, managed service providers, insurers, accountants and associations. | Clear conflict rules, referral disclosure, no paid endorsement disguised as advice.      |
| Web-agency channel    | White-label-ready audit and remediation coordination with client-visible specialist credentials.                   | QA SLA, scope templates, margin model and brand boundaries.                              |
| Webinars / clinics    | Accessible live sessions with captions, Q&A and sector-specific office hours.                                      | Qualified speaker, transcript, sources and useful follow-up asset.                       |
| Founder-led outbound  | Small, researched account lists based on public size/sector signals; helpful diagnostic outreach.                  | Consent and anti-spam review, relevance, easy opt-out and no fabricated personalization. |
| Client expansion      | Use visible findings and milestones to offer scoped remediation and care plans.                                    | Outcome evidence; no preselected renewal or cancellation friction.                       |

## Launch sequence

1.  Closed alpha with internal staff, three contractors and five design partners.

2.  Controlled beta in two verticals with manual concierge support and weekly issue review.

3.  Public English/French launch after independent accessibility and penetration tests close launch blockers.

4.  Partner launch after capacity, QA turnaround and escalation service levels are demonstrated for two consecutive cohorts.

5.  Scale paid acquisition only after cohort gross margin and assessment-to-core conversion meet thresholds.

# 24. Quality assurance and acceptance

| **Gate**                 | **Required evidence**                                                                                                        | **Stop-ship condition**                                                  |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| Discovery acceptance     | Signed problem framing, journey evidence, prototype results, legal assumptions register and accessibility-research findings. | Core demand or user need is unsupported.                                 |
| Design-system acceptance | Component inventory, states, accessibility annotations, content rules and manual test evidence.                              | Critical component lacks accessible interaction pattern.                 |
| Feature acceptance       | Functional tests, security checks, analytics validation, content review and assistive-technology coverage.                   | Acceptance criterion or required audit event fails.                      |
| Content acceptance       | Source, effective date, qualified review, translation QA and accessible-media/document check.                                | Unsourced or outdated regulatory claim.                                  |
| Release candidate        | End-to-end journeys, load/performance tests, backup restore, incident exercise, independent audit and penetration test.      | Severity-1 accessibility/security defect or uncontained privacy risk.    |
| Client deliverable       | Scope match, evidence traceability, specialist review, plain-language QA, document accessibility and release authorization.  | Unsupported conclusion, missing evidence or inaccessible final artefact. |

## Definition of done

- Requirement and acceptance criteria met; no unresolved critical defect.

- Keyboard, screen-reader, zoom/reflow, contrast and reduced-motion checks completed where applicable.

- Threat model and privacy impacts updated; logs and alerts verified; support runbook published.

- Bilingual content state is complete or explicitly unavailable with an approved, accessible fallback.

- Analytics events are accurate, consent-aware and free of prohibited content.

- Documentation, ownership, training and rollback plan are complete.

## Representative end-to-end scenarios

- A keyboard-only HR lead completes the qualifier, purchases an assessment, invites a colleague, uploads evidence and downloads the report.

- A blind executive using a screen reader reviews status, approves a change order and opens the accessible executive summary.

- A contractor receives a limited assignment, accesses only approved evidence, submits findings, completes revisions and loses access after closure.

- An internal PM handles an expired source, blocks an affected report, updates the requirements library and notifies impacted clients.

- A tenant requests export and deletion; the system completes verified offboarding while preserving lawful financial records and legal holds.

# 25. Risks and mitigations

| **Risk**                       | **Impact**                                        | **Early indicator**                                | **Mitigation / owner**                                                                                     |
|--------------------------------|---------------------------------------------------|----------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Commodity positioning          | Low willingness to pay and price competition.     | Prospects ask only for form filing.                | Lead with evidence, qualified review and remediation outcomes; product/growth.                             |
| Regulatory misstatement        | Client harm, legal exposure and trust loss.       | Source disagreement or stale content.              | Versioned sources, qualified two-person review, counsel escalation; AODA specialist.                       |
| Contractor inconsistency       | Rework, delays and unsafe conclusions.            | Low first-pass acceptance, repeated clarification. | Calibration, rubrics, peer review, scorecards and suspension; COO/accessibility lead.                      |
| Scope leakage                  | Margin erosion and contractor conflict.           | Unplanned revisions and uncaptured requests.       | Explicit exclusions, client dependencies, change orders and margin alerts; COO.                            |
| Accessibility failure          | Contradicts brand promise and excludes users.     | Critical defects or panel task failure.            | Accessible-by-construction system, stop-ship authority, independent audit; accessibility lead.             |
| Sensitive data exposure        | Client harm, breach cost and reputational damage. | Excess permissions, anomalous downloads.           | Least privilege, strong identity, DLP-aware logs, incident response and tests; security/privacy lead.      |
| AI overreach                   | Hallucinated advice or untraceable output.        | Unsupported citations or high override rate.       | Human approval, provenance, disable option and monitoring; product/accessibility leads.                    |
| Overbuilding before validation | Capital loss and slow learning.                   | Low paid assessment uptake.                        | CA\$250k Gate 0 and threshold-based capital release; steering committee.                                   |
| 2026 urgency collapse          | Demand falls after deadline.                      | Traffic concentrated in deadline pages.            | Care plans, remediation, procurement, content governance and multi-jurisdiction expansion; growth/product. |
| Vendor lock-in                 | Rising cost and weak portability.                 | Proprietary workflows/data exports.                | Open formats, export tests, abstraction boundaries and exit clauses; engineering/procurement.              |

## Assumptions register

- Target buyers will pay for confidence, coordination and evidence even when official filing resources are free.

- A curated specialist network can meet Ontario demand with predictable quality and turnaround.

- Bilingual capability materially improves credibility and expansion readiness despite higher initial cost.

- WCAG 2.2 AA is an appropriate product target and does not confuse buyers when the current legal baseline is explained separately.

- The company can obtain appropriate professional, cyber and general liability insurance at sustainable cost.

# 26. Source notes, glossary and disclaimers

## Primary source notes

**Ontario — Completing your accessibility compliance report:** [<u>Open source</u>](https://www.ontario.ca/page/completing-your-accessibility-compliance-report) — 20+ employee reporting; December 31, 2026 deadline at time of PRD.

**Ontario — Accessibility rules for businesses and non-profits:** [<u>Open source</u>](https://www.ontario.ca/page/accessibility-rules-businesses-and-non-profits) — High-level organization requirements and size-based context.

**Ontario — Accessibility Compliance Reporting:** [<u>Open source</u>](https://accessibilityreporting.ontario.ca/) — Official reporting portal and authorized certification context.

**Ontario — How to make websites accessible:** [<u>Open source</u>](https://www.ontario.ca/page/how-make-websites-accessible) — Ontario public website guidance and organization-size context.

**Ontario — Integrated Accessibility Standards Regulation:** [<u>Open source</u>](https://www.ontario.ca/laws/regulation/110191) — Current regulatory text; references WCAG 2.0 Level AA for specified web obligations.

**W3C — Web Content Accessibility Guidelines 2.2:** [<u>Open source</u>](https://www.w3.org/TR/WCAG22/) — Product accessibility target and conformance guidance.

**web.dev — Web Vitals:** [<u>Open source</u>](https://web.dev/articles/vitals) — Core Web Vitals definitions and quality thresholds.

**OWASP — Application Security Verification Standard:** [<u>Open source</u>](https://owasp.org/www-project-application-security-verification-standard/) — ASVS 5.0 security verification baseline.

**OWASP — Top 10:** [<u>Open source</u>](https://owasp.org/www-project-top-ten/) — Current application-security awareness baseline.

**IAAP — Certified Professional Directory:** [<u>Open source</u>](https://www.accessibilityassociation.org/certified-professional-directory) — Credential verification source for accessibility specialists.

**Accessible.org — Audit pricing:** [<u>Open source</u>](https://accessible.org/pricing/) — Public directional pricing context; not a market guarantee.

**DigitalA11Y — Audit cost overview:** [<u>Open source</u>](https://www.digitala11y.com/how-much-does-a-web-accessibility-audit-cost/) — Additional directional pricing context; prices vary by scope and region.

Source status: URLs and regulatory statements were reviewed for this PRD on August 18, 2026. Regulatory content must be revalidated before publication and on its scheduled review date.

## Glossary

| **Term**          | **Meaning in this PRD**                                                                                                           |
|-------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| AODA              | Accessibility for Ontarians with Disabilities Act, 2005 and associated standards/regulations.                                     |
| Readiness         | The organization’s evidence-backed preparedness to understand and address relevant accessibility requirements; not certification. |
| Qualified review  | Human review by a person whose verified experience or credential matches the work scope.                                          |
| Manual audit      | Human evaluation using assistive technologies, keyboard interaction, content inspection and judgement in addition to tools.       |
| Finding           | A documented issue or gap with evidence, impact, source mapping, recommendation and status.                                       |
| Authorized signer | The client-side person legally permitted to certify or bind the organization for the relevant representation.                     |
| WCAG              | Web Content Accessibility Guidelines published by W3C.                                                                            |
| ASVS              | OWASP Application Security Verification Standard.                                                                                 |
| RPO / RTO         | Recovery point objective / recovery time objective.                                                                               |

## Legal and commercial disclaimers

- This PRD is a product and commercial specification, not legal advice. Retain qualified Ontario counsel for legal interpretations, contracts, privacy obligations and marketing claims.

- The platform may organize information and provide expert-reviewed recommendations, but the client remains responsible for factual representations, authorized certification, filings and organizational decisions.

- No automated tool, scan, badge or report alone proves legal compliance or complete accessibility.

- Pricing, conversion and margin targets are hypotheses until validated through paid engagements; they are not revenue guarantees.

- The working title and all proposed branding require trademark, domain, language and cultural review before public use.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>FINAL BUILD DIRECTIVE</strong></p>
<p>Release the first CA$250,000 to validate paid demand and delivery economics. If the evidence clears Gate 0, build the platform as a premium trust system—public experience, client workspace, contractor network and operational controls together—not as a decorative landing page.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 27. Claude Code implementation contract

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>HOW TO USE THIS PRD</strong></p>
<p>Place the Markdown edition of this document at /docs/PRD.md. Claude Code must treat requirement IDs, acceptance criteria, accessibility gates, security controls and scope boundaries as the source of truth. It may propose an ADR when a decision is missing; it may not silently weaken a requirement.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Build mode

- Start with Phase 0 validation assets and an interactive prototype; do not generate the entire platform in one pass.

- Implement vertical slices that cross interface, authorization, data, audit logging, analytics, tests and documentation.

- At the start of each slice, restate the requirement IDs, assumptions, data migration impact, accessibility risks and security threats being addressed.

- At the end of each slice, run the required checks, summarize evidence, list remaining risks and update /docs/traceability.md.

- If a third-party component blocks keyboard, screen-reader, zoom, localization, privacy or performance requirements, replace it rather than patching over the defect.

## Recommended repository shape

| **Path**                | **Purpose**                                                                                                                           |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| /apps/web               | Public site, qualifier, authenticated client/contractor portal and internal console using route groups and server-side authorization. |
| /packages/ui            | Accessible design-system primitives, tokens, Storybook stories, interaction contracts and visual regression fixtures.                 |
| /packages/domain        | Framework-independent organization, project, requirement, finding, evidence, assignment and deliverable rules.                        |
| /packages/db            | Schema, migrations, tenant controls, seed factories and data-retention jobs.                                                          |
| /packages/auth          | Roles, permissions, policy checks, session utilities and break-glass controls.                                                        |
| /packages/integrations  | Typed adapters for CRM, payment, storage, email, calendar, e-signature, support and accounting.                                       |
| /packages/observability | Structured events, redaction, product analytics, tracing, SLOs and alerts.                                                            |
| /packages/testing       | Accessibility fixtures, journey helpers, tenant-isolation tests and synthetic monitoring.                                             |
| /docs                   | PRD, ADRs, data dictionary, threat model, accessibility test plan, runbooks and traceability matrix.                                  |
| /infra                  | Environment definitions, deployment policy, backup configuration and least-privilege service identities.                              |

## Technical baseline

Use a TypeScript monorepo and a server-rendered React framework such as Next.js App Router, with PostgreSQL, S3-compatible object storage, a managed standards-based identity provider, a structured headless CMS and event-driven integration adapters. Select current supported versions at project kickoff, pin them in the lockfile and record vendor choices in Architecture Decision Records. Vendor choices remain replaceable behind domain interfaces.

| **Concern**   | **Required implementation posture**                                                                                                                  |
|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| UI            | Semantic HTML first; accessible component primitives; CSS design tokens; no overlay; reduced-motion variants; server-render critical public content. |
| API           | Typed contracts, explicit authorization on every object, schema validation, idempotency for external writes and predictable error envelopes.         |
| Database      | Migrations under review, tenant ID on tenant-owned data, database-level enforcement where practical, soft-delete only when retention requires it.    |
| Files         | Direct-to-quarantine upload, malware scan, classification, signed expiring access, immutable original and versioned derivatives.                     |
| Jobs          | Durable queue for scanning, report generation, integration sync, notifications, retention and AI tasks; retries and dead-letter review.              |
| Testing       | Unit and integration tests, Playwright journeys, axe checks, Storybook interaction tests, authorization matrix tests and manual AT evidence.         |
| Observability | Structured redacted logs, traces, metrics, audit events, SLO alerts and correlation IDs visible to support.                                          |
| Deployment    | Preview environments, protected production, migration checks, staged rollout, rollback path and infrastructure-as-code.                              |

## Claude Code delivery sequence

| **Slice**                 | **Requirement focus**                                  | **Demonstrable outcome**                                                                                                  |
|---------------------------|--------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| CC-01 Foundation          | PUB-001, PUB-004; accessibility and security baselines | Monorepo, CI, environments, tokens, core layout, CMS model, audit-event skeleton and documented ADRs.                     |
| CC-02 Public conversion   | PUB-001–006, CNV-001–004                               | Bilingual homepage, employee selector, qualifier, explainable result, consent-aware analytics and human-contact fallback. |
| CC-03 Commerce + identity | PUB-003; client identity controls                      | Accessible checkout/booking, organization creation, MFA, roles, agreement and project shell.                              |
| CC-04 Evidence + matrix   | Client portal MVP                                      | Guided intake, secure file pipeline, evidence vault and versioned requirements matrix with audit history.                 |
| CC-05 Findings + reports  | Client issue register and reports                      | Traceable finding lifecycle, accessible executive HTML/PDF, retest and controlled release.                                |
| CC-06 Contractor delivery | CTR-001–007                                            | Credentialing, capacity, scoped assignment, QA/revision workflow and contractor invoice status.                           |
| CC-07 Operations          | Internal console                                       | Pipeline, delivery risk, scope/margin, capacity, requirements/content review and incident dashboard.                      |
| CC-08 Care + intelligence | AI guardrails, recurring service                       | Human-approved AI assists, provenance, care-plan tasks, trends and client-controlled AI setting.                          |
| CC-09 Hardening           | All NFRs and release gates                             | Independent audit fixes, penetration-test fixes, performance budgets, DR exercise and production runbooks.                |

## Environment and command contract

Claude Code should generate and maintain a root README with exact commands. The following logical commands must exist, even if the chosen package manager uses different aliases:

- install — deterministic dependency installation from a committed lockfile.

- dev — start the full local experience with safe mock integrations and documented seed accounts.

- lint / typecheck / test — static quality and automated tests with non-zero exit on failure.

- test:e2e — role-based end-to-end journeys across public, client, contractor and internal experiences.

- test:a11y — automated accessibility checks plus a link to the current manual test evidence.

- test:authz — cross-tenant and role matrix tests; every protected resource class must be covered.

- db:migrate / db:seed / db:reset-safe — reviewed migrations and non-production sample data only.

- build / start — production-equivalent build and launch; no hidden development dependency.

## Seed/demo scenario

Create fictional data only: “Maple Grove Learning Group,” an Ontario education operator with 86 employees, two public websites, a December 2026 readiness project, five evidence objects, four findings of mixed severity, one approved change order and one assigned audit contractor. Include client-admin, executive, web-lead, contractor, project-manager, reviewer and platform-admin users. The demo must make tenant and role boundaries visible and must not include real regulatory certifications.

## Non-negotiable engineering constraints

- Never place authorization solely in UI components; enforce it at server/domain and storage boundaries.

- Never send evidence-file contents to an AI provider by default. Require an approved task, minimal payload, client policy check and logged provenance.

- Never expose storage keys, sequential tenant identifiers, internal contractor margins or private audit notes to client URLs or analytics.

- Never ship an interaction that depends on hover, drag, colour, animation or pointer precision alone.

- Never mark accessibility work complete from automated tooling alone; link manual evidence and named reviewer.

- Never create a production migration without rollback/roll-forward notes, backup impact and tested representative data.

- Never hard-code regulatory claims in components. Render them from versioned content objects with sources and review dates.

- Never claim the product is “AODA certified,” “government approved” or a substitute for client certification or legal advice.

## Pull-request evidence template

| **Field**        | **Required content**                                                                                |
|------------------|-----------------------------------------------------------------------------------------------------|
| Scope            | Requirement IDs, user journey and explicit non-scope.                                               |
| Decision         | Relevant ADR and alternatives considered.                                                           |
| Evidence         | Screenshots/video where useful, test output, accessibility evidence and analytics event validation. |
| Security/privacy | Authorization cases, data touched, threat/PIA impact and logging/redaction check.                   |
| Migration        | Schema/content changes, rollback or roll-forward plan and seed impact.                              |
| Risk             | Known limitations, deferred work, owner and target milestone.                                       |

## First Claude Code prompt

Use the following instruction after placing this PRD in the repository:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>IMPLEMENTATION PROMPT</strong></p>
<p>Read /docs/PRD.md in full. Do not write application code yet. Produce: (1) a requirement traceability matrix; (2) an assumptions/questions register; (3) proposed ADRs for stack, identity, tenancy, files, CMS, integrations, analytics and AI; (4) a Phase 0 prototype and validation plan; (5) an incremental delivery plan for CC-01 through CC-09; and (6) the risks that could invalidate the CA$5M programme. Cite PRD requirement IDs. Wait for approval before scaffolding.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>
