# Accessibility test plan

- **Status:** v0 (CC-01). Extended at every slice.
- **Target:** WCAG 2.2 Level AA across public site, portals and generated client artefacts (ACC-001).
- **Authority:** the accessibility lead holds stop-ship (PRD §20). No release exception without their sign-off.

## The rule that governs this document

**ENG-005 — "Never mark accessibility work complete from automated tooling alone; link manual evidence and named reviewer."**

Automated checks in this repository are regression coverage between manual passes. They are listed first because they run most often, not because they carry the most weight.

## Automated coverage (runs on every pull request)

| Check | Where | What it actually proves |
|---|---|---|
| Token contrast | `packages/ui/src/tokens/tokens.contrast.test.ts` | Every declared foreground/background pair meets 4.5:1 (text) or 3:1 (non-text), computed from the hex values. Also pins the restrictions on brand teal and warm gold. |
| Component axe | `packages/ui/src/components/primitives.test.tsx` | No automatically detectable violations in isolated components. Contrast and landmark rules are disabled here — jsdom has no layout engine — and covered elsewhere. |
| Page axe | `apps/web/e2e/accessibility.spec.ts` | wcag2a/aa, wcag21a/aa, wcag22aa against the real rendered page, in both locales, on desktop and mobile viewports. |
| Reflow | `apps/web/e2e/accessibility.spec.ts` | No horizontal scrolling at 320 CSS px, equivalent to 400% zoom at 1280px (WCAG 1.4.10). |
| Keyboard | `apps/web/e2e/shell.spec.ts` | Skip link is the first tab stop, moves focus to `main`; every interactive element has a non-zero focus outline. |
| No JavaScript | `apps/web/e2e/no-javascript.spec.ts` | Primary content and navigation work with scripting disabled (ARC-006). |

Automated checks cannot detect: whether an accessible name is *meaningful*, whether focus order matches visual order, whether an error message is *understandable*, whether a screen reader announces a state change at the right moment, or whether any of this works for a real person. That is what the manual passes and the panel are for.

## Manual pass — required for every release candidate

Recorded per release in `docs/accessibility-evidence/<release>.md` with the tester's name, the assistive technology and its version, and the date.

| Area | Method | Supported combinations (assumption A-06: two most recent major versions of each pair) |
|---|---|---|
| Keyboard | Complete every core task with no pointer. Check focus visibility, order, no traps, skip links. | — |
| Screen reader | Complete every core task. | JAWS + Chrome/Edge · NVDA + Firefox/Chrome · VoiceOver + Safari · TalkBack + Chrome |
| Zoom and reflow | 200% text resize; 400% zoom; check no loss of content or function. | — |
| High contrast | Windows High Contrast Mode. | — |
| Motor / touch | Target size and spacing; every gesture has a non-gesture alternative; no drag-only interaction; timeouts extendable. | — |
| Cognitive | Plain-language review; consistent navigation; visible progress; recoverable errors. | — |
| Documents | Tagged PDF/Office: reading order, language, headings, lists, tables, links, alt text. | From CC-05 |
| Authentication | Accessible MFA, password-manager support, paste allowed, alternative verification, accessible recovery. | **From CC-03a — now live and untested by a human.** See below. |

## Paid disability panel (ACC-010)

Compensated sessions with people with diverse disabilities and assistive-technology experience, at four stages: **discovery** (Phase 0), **prototype** (CC-02), **beta** (CC-05), **pre-launch** (CC-09). Blind and low-vision, keyboard-only, Deaf and hard-of-hearing, mobility, neurodivergent, and cognitive or learning disabilities (PRD §4).

Participation is compensated, optional, and supported with accessible research materials. Findings are dispositioned in writing — fixed, deferred with a date, or accepted with a stated reason — and the disposition is reviewed by the accessibility lead, not by the team that wrote the code.

## Independent audit (ACC-011)

Before launch, by a qualified third party **not responsible for primary implementation**. CC-09.

## Severity model (ACC-012)

| Severity | Definition | Handling |
|---|---|---|
| 1 | A person with a disability cannot complete a core task, or is exposed to harm. | **Launch blocker.** No release with one open (ACC-013). |
| 2 | A core task is completable but with substantial difficulty, or a non-core task is blocked. | Release only with an executive-approved, time-bound remediation plan **and** an accessible alternative that has been tested with affected users. |
| 3 | Noticeable friction; a workaround exists and is discoverable. | Scheduled with an owner and a date. |
| 4 | Cosmetic or minor inconsistency. | Backlog. |

Every defect carries: severity, remediation owner, due date, retest evidence, and — where an exception is granted — the approver's name.

## CC-03a status — the authentication surface

Shipped, automated coverage only, and this is the slice where that gap costs the
most: an authentication gate nobody has tested with a screen reader is a gate
that may simply exclude people from the product.

What has been verified automatically:

- axe on sign-in, second factor, recovery, sign-up and the confirmation page, in
  both languages, plus the four signed-in screens after a real sign-in.
- Reflow at 320 CSS px (400% zoom equivalent) on all of the above.
- The complete account journey — sign-up, sign-in, enrolment, verification,
  invitation, sign-out — with **JavaScript disabled**.
- A code field that accepts a pasted value with a space in it.
- A setup key offered as text as well as an `otpauth:` link.

**What a named tester must still do, before this surface is called done:**

1. Complete **MFA enrolment** end to end with JAWS, NVDA and VoiceOver — ACC-009
   names this specifically, and enrolment is the step where a person is moving
   between two devices while a timer runs.
2. Complete **recovery** with a screen reader, from a printed code sheet.
3. Confirm the **timeout warning** is announced without stealing focus, and that
   "keep me signed in" is reachable from wherever focus happens to be.
4. Confirm a **password manager** fills and submits sign-in on each supported
   pair, and that paste is not blocked anywhere.
5. Sign in at **400% zoom** on a phone-sized viewport, keyboard only.

Until that record exists in `docs/accessibility-evidence/`, ACC-009 is **not
met**, and no amount of green CI changes that (ENG-005).

## CC-01 status

CC-01 ships a layout shell with no public content. What has been verified:

- Token contrast: all 13 text pairs and 7 non-text pairs pass, computed (28 assertions).
- Component axe: 10 primitives, no violations.
- Page axe, reflow, keyboard, no-JavaScript: pass on `/en` and `/fr`, desktop and mobile.

**Not yet done, and not claimed:** no manual screen-reader pass, no panel session, no zoom testing by a human. CC-01 has no user-facing task to test. The first manual pass and the first panel session are CC-02 exit criteria, before any public page ships.
