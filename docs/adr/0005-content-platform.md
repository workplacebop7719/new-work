# ADR-0005 — Content platform and regulatory content governance

- **Status:** Accepted (CC-01)
- **Date:** 2026-08-18
- **Deciders:** Design lead + content design (accountable), AODA specialist, engineering lead
- **Blocks:** CC-01, CC-02
- **PRD basis:** §7 PUB-001/PUB-004; §13 Content model; §11 Content desk; §17 Content layer; §20 Governance; §27 constraint 7

## Context

Content here is not marketing copy with a CMS bolted on. Two PRD rules make the content model a *safety* system:

- **ENG-007** — regulatory claims are never hard-coded in components; they render from versioned content objects carrying sources and review dates.
- **CNT-005** — expired or disputed regulatory content automatically displays an internal hold and cannot be republished without review.

Plus full bilingual EN/FR with explicit missing-translation states (PUB-001), two-person review with source and effective-date capture (§20), and scheduled revalidation (§26).

That is a workflow requirement most headless CMS products only partly satisfy, and the authoring UI itself must be usable by the content desk — including any team member using assistive technology.

## Decision

**A headless CMS for editorial content, with a distinct `RegulatoryClaim` content type that carries governance fields and is enforced in application code, not only in CMS configuration.**

1. **Two content classes, deliberately separated:**
   - *Editorial* — pages, sector guides, case narratives, resources. Normal publish workflow.
   - *Regulatory claim* — an atomic, citable statement (e.g. the December 31, 2026 reporting deadline). Fields: statement (EN/FR), jurisdiction, source URL, source title, effective date, last-verified date, reviewer identity, second reviewer identity, next-review date, status (`draft | in-review | published | hold | retired`).
2. **Components render regulatory claims by ID**, never as literal strings. A CI lint fails when a component file contains a regulatory phrase pattern (dates paired with obligation words, "WCAG", "AODA", "must", statute names) outside a claim reference. This is what makes ENG-007 real rather than aspirational.
3. **Automatic hold.** A scheduled job moves any published claim past its `next-review date` to `hold`. Held claims render a neutral fallback (the surrounding content stays available; the claim is replaced by a "this guidance is being reviewed" state with a link to the official source) and cannot be republished without a fresh two-person review. This must have a **negative test**: a held claim must never render its statement.
4. **Bilingual model.** Every page and claim stores translation status, translator/reviewer, source-language version and sync state (CNT-002). When FR is missing, the site says so explicitly and offers the EN version — it never silently falls back, and it never machine-translates regulatory statements.
5. **Prohibited-claims lint.** A CI check fails the build on "certified compliant", "government approved", "AODA certified", "guaranteed compliance" and their FR equivalents anywhere in content or code (CNT-008, ENG-008). The mandatory-wording list from §5 is maintained beside it.
6. **Vendor selection criteria**, in priority order: (a) authoring UI passes our own accessibility evaluation with a real AT user; (b) localization workflow with per-field translation state; (c) scheduled publish/unpublish and version history; (d) roles and approval chains supporting two-person review; (e) content-as-data export in an open format (ARC-002 exit plan); (f) Canadian or acceptable region (Q-17).
7. **Preview and SSR.** Public pages are server-rendered from published content at build/request time with a documented cache invalidation path; draft preview requires authentication.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Git-based content (MDX in the repo) | Excellent versioning, review and diffing; free two-person review via PRs. Rejected as primary because PUB-001 requires publishing "without developer intervention" and the content desk is not a git audience. *Partially adopted:* regulatory claims are exported to the repo on publish so their history is diffable and auditable outside the CMS. |
| Building our own CMS | Full control of authoring accessibility; a large, permanent product surface with no revenue. Rejected. |
| Storing regulatory claims in the application database instead of the CMS | Better transactional coupling to the requirements library (OPS-005) and arguably the right long-term home. **Genuinely close call.** Rejected for CC-01 because the content desk needs one authoring surface; revisit at CC-07 when the requirements library gets its own tooling — the claim schema is designed to migrate. |
| CMS-managed everything including portal microcopy | Puts product UI strings behind a vendor and a publish cycle. Rejected; product strings live in the repo's i18n catalogue. |

## Consequences

- **Positive:** a stale regulatory claim degrades safely and automatically instead of quietly misinforming a buyer — the single highest-severity content risk in §25.
- **Positive:** the claim schema doubles as the seed for the client-facing requirements matrix (CLP-005), so the two never disagree about a source.
- **Negative:** the regulatory-phrase lint will produce false positives and annoy developers. Mitigation: an explicit allowlist annotation with a required reason, reviewed in PR.
- **Negative:** two content classes and an export-to-repo step is more machinery than a marketing site needs. Justified by §25 "Regulatory misstatement".
- **Risk:** CMS authoring-UI accessibility is a real vendor risk with no good mitigation short of replacement (§27). Evaluate *before* signing, with a paid panel participant, not after.

## Status at CC-01

The claim schema, the automatic-hold rule and the render-by-id path are built and tested (`packages/domain/src/content.ts`). The CMS **vendor** is still open (Q-13), so CC-01 reads claims from a reviewed local file behind the same accessor the CMS will use.

`resolveClaim` returns a discriminated union rather than a string. On the `hold` branch there is no `text` field at all, so a component structurally cannot render a stale regulatory statement by ignoring a boolean — which is a stronger guarantee than the "displays an internal hold" wording in CNT-005 strictly required.

## Requirements satisfied

PUB-001, PUB-004, CNT-001, CNT-002, CNT-003, CNT-005, CNT-008, OPS-007, ENG-007, ENG-008, ANL-005.

## Review triggers

Revisit if: the CMS cannot express the claim workflow without custom plugins; regulatory claims and the requirements library (OPS-005) diverge in practice; or the authoring UI fails accessibility evaluation.
