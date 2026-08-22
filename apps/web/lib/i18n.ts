/**
 * Bilingual routing and UI strings — PUB-001.
 *
 * "All core pages can be published in English and French without developer
 * intervention; missing translation states are explicit."
 *
 * Two separate things live under that requirement and are kept apart here:
 *
 *   - Product UI strings (this file). Shipped in the repo, translated with the
 *     build, never machine-translated.
 *   - Editorial and regulatory content (the CMS, ADR-0005). Published by the
 *     content desk without a deploy.
 *
 * A missing string in either is an explicit state, never a silent English
 * fallback that a French reader would mistake for a translation.
 */
export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

type Dictionary = Record<string, string>;

const en = {
  'site.name': 'Project Northstar',
  'site.tagline': 'AODA readiness, organized around evidence.',
  'nav.skipToContent': 'Skip to main content',
  'nav.mainLabel': 'Main',
  'nav.languageLabel': 'Language',
  'nav.switchToFrench': 'Français',
  'nav.switchToEnglish': 'English',
  'footer.legal':
    'Project Northstar is a working title. This service organizes evidence and coordinates qualified review. It does not certify your organization and it is not legal advice.',
  'status.foundation.heading': 'Foundation slice (CC-01)',
  'status.foundation.body':
    'This deployment is the CC-01 foundation: design tokens, accessible primitives, tenant isolation, the audit trail and the content model. The public experience is built in CC-02.',
  'translation.missing.heading': 'This content is not available in French yet',
  'translation.missing.body':
    'We show the English version below rather than an automatic translation. Regulatory wording is translated by a qualified reviewer before it is published.',
  'claim.hold.heading': 'This guidance is being reviewed',
  'claim.hold.body':
    'We are re-verifying this statement against its source and are not showing it until that review is complete. The official source is linked below.',
  'claim.source': 'Source',
  'claim.lastReviewed': 'Last reviewed',
  'nav.checkReadiness': 'Check your readiness',
  'nav.howItWorks': 'How it works',
  'nav.resources': 'Resources',
  'resources.eyebrow': 'Resources',
  'resources.title': 'A few things worth reading',
  'resources.lede':
    'Short, specific pieces about how this work is actually done. We would rather publish three useful ones than thirty thin ones, so the list is deliberately short.',
  'resources.kind.guide': 'Guide',
  'resources.kind.checklist': 'Checklist',
  'resources.kind.explainer': 'Explainer',
  'resources.minutes': '{n} minute read',
  'resources.updated': 'Updated',
  'resources.backToIndex': 'All resources',
  'resources.qa.done': 'Accessibility of this page checked by {name} on {date}.',
  'resources.qa.missing':
    'This page has not yet had a manual accessibility check by a named reviewer. Automated checks pass, but we do not count those as a review.',
  'resources.home.heading': 'Things worth reading',
  'resources.home.lede': 'How this work is actually done, written by the people who do it.',
  'resources.home.cta': 'All resources',
  'nav.services': 'Services',
  'footer.exploreHeading': 'Explore',
  'footer.positionHeading': 'Where we stand',
  'footer.workingTitle': 'Project Northstar is a working title and is not trademark-cleared. Prices shown are indicative.',
  'nav.contact': 'Talk to a person',
  'consent.heading': 'Analytics on this site',
  'consent.body':
    'We would like to measure how this site is used so we can improve it. Nothing is loaded until you choose, and the site works exactly the same either way. You can change your mind at any time.',
  'consent.accept': 'Allow analytics',
  'consent.decline': 'No analytics',
  'qualifier.start.heading': 'Check your readiness',
  'qualifier.start.body':
    'A few plain questions about your organization. At the end we suggest a sensible next step and show you how we got there.',
  'qualifier.start.point.questions': '{count} questions, one at a time.',
  'qualifier.start.point.noAccount': 'No account needed. You can save your place and come back.',
  'qualifier.start.point.notLegal':
    'This is a routing tool, not a legal opinion. It will not tell you whether you meet any requirement.',
  'qualifier.start.cta': 'Start',
  'qualifier.start.humanPath': 'Skip this and talk to a person instead',
  'qualifier.progressLabel': 'Readiness questions',
  'qualifier.next': 'Continue',
  'qualifier.back': 'Back',
  'qualifier.finish': 'See my suggested next step',
  'qualifier.error.prefix': 'Error:',
  'qualifier.error.required': 'Choose an answer to continue. If none fit, choose the option closest to your situation.',
  'qualifier.error.invalid': 'That answer was not one of the options. Please choose again.',
  'qualifier.error.resume': 'Enter an email address and tick the box so we know we may write to you.',
  'qualifier.resume.summary': 'Save my place and come back later',
  'qualifier.resume.body':
    'Your answers are already saved on this device. If you would like a link by email as well, tell us where to send it.',
  'qualifier.resume.emailLabel': 'Email address',
  'qualifier.resume.consent': 'Yes, email me a link to come back to these answers.',
  'qualifier.resume.cta': 'Email me a link',
  'qualifier.resume.saved': 'Saved. We have recorded your address and will send the link.',
  'result.heading': 'Your suggested next step',
  'result.category.likely_self_serve': 'You may not need us',
  'result.category.assessment_fit': 'A readiness assessment fits',
  'result.category.specialist_fit': 'Specialist work fits',
  'result.category.uncertain': 'This needs a person',
  'result.body.likely_self_serve':
    'Based on what you told us, the official guidance is likely to be enough on its own. We would rather say that than sell you something you do not need.',
  'result.body.assessment_fit':
    'A readiness assessment would tell you what evidence you already have, what is missing, and what to do first.',
  'result.body.specialist_fit':
    'You already know roughly where you stand, so a general assessment would repeat what you know. Specialist work is the better starting point.',
  'result.body.uncertain':
    'Your answers do not point clearly in one direction. We will not guess. A qualified reviewer should look before anything is recommended.',
  'result.why.heading': 'Why we suggested this',
  'result.ruleVersion': 'Rule version',
  'result.uncertainty.heading': 'What this is not',
  'result.talkToSomeone': 'Arrange a conversation',
  'result.official.heading': 'The official route',
  'result.official.body':
    'The government publishes this guidance itself, free. If it answers your question, use it — that is a good outcome.',
  'result.changeAnswers': 'Change my answers',
  'contact.heading': 'Talk to a person',
  'contact.body':
    'You do not need to answer any questions first. Reach us however suits you, and tell us as much or as little as you like.',
  'contact.phoneLabel': 'Phone',
  'contact.emailLabel': 'Email',
  'contact.relayLabel': 'Relay and TTY',
  'contact.relayBody': 'We accept relay calls and calls made through Bell Relay Service. Tell the operator our number.',
  'contact.accommodationLabel': 'Accommodations',
  'contact.accommodationBody':
    'Tell us how you would prefer to communicate and we will work that way. If you need materials in another format, ask.',
  'contact.noPressure': 'We will not add you to a mailing list because you contacted us.',
  'rateLimit.heading': 'Too many requests from your connection',
  'rateLimit.body':
    'We limit how often this form can be submitted from one connection, to stop it being misused. You have reached that limit.',
  'rateLimit.retry': 'Please try again in about {minutes} minute(s).',
  'rateLimit.noPuzzle':
    'We will not ask you to solve a puzzle or prove you are human. If you need to continue now, contact us and a person will help.',
  'rateLimit.contact': 'Talk to a person now',

  // ---- Homepage: hero ----
  'hero.eyebrow': 'Ontario accessibility readiness',
  'hero.title.lead': 'Know what applies to you,',
  'hero.title.emphasis': 'and what to do',
  'hero.title.tail': ' about it.',
  'hero.factsLabel': 'How the work is controlled',
  'hero.fact.reviewed.label': 'Every conclusion',
  'hero.fact.reviewed.value': 'Signed by a named qualified reviewer',
  'hero.fact.delivered.label': 'Delivered by',
  'hero.fact.delivered.value': 'Verified specialists, scope by scope',
  'hero.fact.tested.label': 'Tested by',
  'hero.fact.tested.value': 'A paid panel of disabled people',
  'hero.lede':
    'We help Ontario organizations find out which accessibility requirements are likely in scope, what evidence they already have, and what to fix first — with every technical conclusion reviewed by a qualified person.',
  'hero.primaryCta': 'Check your readiness',
  'hero.secondaryCta': 'See how delivery works',
  'hero.reassurance': 'Eight questions. No account. We will tell you if you do not need us.',
  'hero.band.under_20': 'You told us you have fewer than 20 employees. Much of what follows may not apply to you — we say so plainly below.',
  'hero.band.20_to_49': 'You told us you have 20 to 49 employees. Reporting and policy obligations are usually the place to start.',
  'hero.band.50_to_199': 'You told us you have 50 to 199 employees. Website and document requirements usually matter at this size as well as reporting.',
  'hero.band.200_plus': 'You told us you have 200 or more employees. Expect a wider scope and more internal coordination than a smaller organization.',

  // ---- Homepage: band selector ----
  'band.eyebrow': 'Your organization',
  'band.heading': 'How big is your organization?',
  'band.lede':
    'Size changes which requirements are likely to apply. Tell us and we will point you at the parts that matter — nothing is hidden either way, and you can change this at any time.',
  'band.under_20': 'Fewer than 20 employees',
  'band.20_to_49': '20 to 49 employees',
  'band.50_to_199': '50 to 199 employees',
  'band.200_plus': '200 or more employees',
  'band.note.under_20': 'Fewest obligations',
  'band.note.20_to_49': 'Reporting usually applies',
  'band.note.50_to_199': 'Our most common client size',
  'band.note.200_plus': 'Wider scope, more coordination',
  'band.confirmation': 'Showing guidance for: {band}. Everything else on this site is still available.',

  // ---- Homepage: offers ----
  'offers.eyebrow': 'What we do',
  'offers.heading': 'Scoped work, with the exclusions stated up front.',
  'offers.lede':
    'Each engagement says what you get, what it costs, how long it takes, what we need from you, and what it does not cover. If a piece of work is not right for you, we would rather you knew before you paid.',
  'offers.indicative': 'indicative',
  'offers.custom': 'Scoped per engagement',
  'offers.includes': 'Includes',
  'offers.timing': 'Timing',
  'offers.inputs': 'We need from you',
  'offers.excludes': 'Not included',
  'offers.priceNote':
    'Prices are indicative and are confirmed in a written scope before any work begins. Nothing on this page is a quote.',

  'offer.readiness_assessment.name': '2026 Readiness Assessment',
  'offer.readiness_assessment.outcome': 'Turn a vague worry into a written picture of where you actually stand.',
  'offer.readiness_assessment.includes': 'Structured intake, a 60-minute review, an evidence snapshot, a priority map and a recommended next scope.',
  'offer.readiness_assessment.timing': 'About two weeks from intake.',
  'offer.readiness_assessment.inputs': 'A short call, and access to the policies and records you already have.',
  'offer.readiness_assessment.excludes': 'No remediation work, no website audit, and no filing on your behalf.',

  'offer.core_readiness.name': 'Core Readiness Package',
  'offer.core_readiness.outcome': 'Close the gaps in documents, training records and policy.',
  'offer.core_readiness.includes': 'Policy and evidence review, a requirements matrix, an action register and an executive summary.',
  'offer.core_readiness.timing': 'Four to six weeks.',
  'offer.core_readiness.inputs': 'A named owner on your side, and time from whoever holds the records.',
  'offer.core_readiness.excludes': 'No website code changes and no document remediation — those are separate scopes.',

  'offer.digital_readiness.name': 'Digital Readiness Package',
  'offer.digital_readiness.outcome': 'Give your web team a prioritized, reproducible list of what to fix.',
  'offer.digital_readiness.includes': 'A manual sample audit by a qualified auditor, a prioritized issue register, a remediation workshop and a retest allowance.',
  'offer.digital_readiness.timing': 'Four to eight weeks depending on the size of the site.',
  'offer.digital_readiness.inputs': 'A test environment, and someone who can answer questions about the site.',
  'offer.digital_readiness.excludes': 'We do not change your production system. Fixes are made by your team, or under a separate remediation scope.',

  'offer.remediation_management.name': 'Remediation Management',
  'offer.remediation_management.outcome': 'Take the coordination burden off your team.',
  'offer.remediation_management.includes': 'Specialist sourcing, project management, quality assurance, change control and a verified handoff.',
  'offer.remediation_management.timing': 'Scoped per engagement.',
  'offer.remediation_management.inputs': 'Decision-making authority and a regular point of contact.',
  'offer.remediation_management.excludes': 'We do not accept work outside an agreed change order.',

  'offer.care_plan.name': 'Accessibility Care Plan',
  'offer.care_plan.outcome': 'Stop the same problems coming back.',
  'offer.care_plan.includes': 'Scheduled checks, content support, policy refresh, training reminders and a reporting dashboard.',
  'offer.care_plan.timing': 'Monthly, cancel with 30 days notice.',
  'offer.care_plan.inputs': 'Someone who receives the monthly summary and can act on it.',
  'offer.care_plan.excludes': 'Not a substitute for an audit when your site changes substantially.',

  // ---- Homepage: method ----
  'method.eyebrow': 'How it works',
  'method.heading': 'Four stages, and you can see where you are in each one.',
  'method.lede': 'The same shape every time, whether the engagement is two weeks or six months.',
  'method.understand.name': 'Understand',
  'method.understand.body': 'Work out what is likely to apply to your organization, and write down why. A qualified reviewer confirms it before anything is quoted.',
  'method.evidence.name': 'Evidence',
  'method.evidence.body': 'Gather what you already have into one place, see what is missing, and stop guessing about the rest.',
  'method.remediate.name': 'Remediate',
  'method.remediate.body': 'Fix what matters first, with reproduction steps and acceptance checks your team can act on. Specialists are matched by verified skill and availability.',
  'method.maintain.name': 'Maintain',
  'method.maintain.body': 'Scheduled checks and content review so the same gaps do not reappear the next time your site or your policies change.',

  // ---- Homepage: trust ----
  'trust.eyebrow': 'How we work',
  'trust.heading': 'The commitments we hold ourselves to.',
  'trust.lede': 'These are policies, not promises about outcomes. You can hold us to them.',
  'trust.review.name': 'A qualified person signs every conclusion',
  'trust.review.body': 'No audit finding or requirements interpretation reaches you without a named reviewer. High-risk conclusions get a second person, and the reviewer is never the person who wrote the work.',
  'trust.credentials.name': 'Specialists are verified before they touch your work',
  'trust.credentials.body': 'We check credentials, references, insurance and conflicts, and every specialist completes a paid calibration assignment before any live client work.',
  'trust.security.name': 'Your evidence is handled carefully',
  'trust.security.body': 'Files are scanned before anyone can open them, access is scoped to the specific work and expires automatically, and every download is recorded.',
  'trust.livedExperience.name': 'Disabled people are paid to test this',
  'trust.livedExperience.body': 'A standing panel of people with a range of disabilities and assistive technologies tests our product and our deliverables. Participation is compensated. This is not a volunteer arrangement.',
  'trust.boundaries.name': 'We say what we are not',
  'trust.boundaries.body': 'We are not affiliated with any government. We cannot certify your organization or file on your behalf, and no report we write is legal advice. Your authorized signer remains responsible for what your organization represents.',

  // ---- Homepage: proof (empty state) ----
  'proof.eyebrow': 'Proof',
  'proof.heading': 'We have not published case narratives yet.',
  'proof.body':
    'This is where before-and-after stories will go: the constraint, what was done, and the measured result. We are not going to fill the space with anonymous quotes in the meantime — on a site about trustworthiness, that would be the wrong thing to fake.',
  'proof.invitation':
    'We are working with a small number of design partners first. If you would like to see the actual deliverable format before you commit to anything, ask and we will show you a redacted sample.',
  'proof.cta': 'Ask to see a sample',

  // ---- Homepage: final CTA ----
  'finalCta.heading': 'Where would you like to start?',
  'finalCta.lede': 'The questions take a few minutes and cost nothing. If you would rather just talk to someone, that is an equally good first step.',
  'finalCta.primary': 'Check your readiness',
  'finalCta.secondary': 'Talk to a person',

  // ---- How it works page ----
  'howItWorks.title': 'How delivery works',
  'howItWorks.lede':
    'Who does the work, what controls it, and what we ask of you. If any of this does not fit how your organization operates, it is better to find out now.',
  'howItWorks.network.heading': 'A curated specialist network, not a marketplace',
  'howItWorks.network.body':
    'Work is delivered by vetted specialists — Ontario accessibility consultants, certified manual auditors, front-end remediation developers and accessible-document specialists. They are selected on verified skill, capacity, language and conflict status, never by bidding your work down. Contractors see only the specific evidence their assignment names, and that access expires when the assignment closes.',
  'howItWorks.quality.heading': 'What stops a bad deliverable reaching you',
  'howItWorks.quality.body':
    'Nothing goes out while a quality exception is open, a reviewer is unnamed, or a cited source has passed its review date. That is enforced by the system, not by someone remembering. High-risk conclusions need a second qualified reviewer, and the person who wrote the work cannot be the person who approves it.',
  'howItWorks.security.heading': 'How your evidence is handled',
  'howItWorks.security.body':
    'Uploads go straight to a quarantine area and are scanned before anyone can open them. Files are never served from a plain link — every download is a short-lived, single-use address issued after a permission check and recorded in an audit log you can read. Your organization can export everything and ask for verified deletion.',
  'howItWorks.accessibility.heading': 'Our own accessibility',
  'howItWorks.accessibility.body':
    'We build to WCAG 2.2 AA across this site, the client portal and the reports we produce. Automated checks run on every change, but they never close an accessibility item on their own — a named person tests with a keyboard, a screen reader and at high zoom before a release. An independent audit by someone who did not build it happens before launch.',
  'howItWorks.responsibilities.heading': 'What we need from you',
  'howItWorks.responsibilities.body':
    'A named owner who can make decisions, access to the records you already hold, and someone who can answer questions about your website. Engagements slip most often because evidence takes longer to gather than expected — we will tell you early if that is happening.',
  'howItWorks.limits.heading': 'What we will not do',
  'howItWorks.limits.body':
    'We will not tell you that you are finished. We do not file anything on your behalf, we are not affiliated with any government, and nothing we produce is legal advice. If an overlay widget is what you are looking for, we are not the right supplier — those do not fix inaccessible content.',

  /* ---- Accounts and access (CC-03a) ---------------------------------- */

  'nav.signIn': 'Sign in',
  'nav.account': 'Your account',

  'auth.signIn.title': 'Sign in',
  'auth.signIn.lede':
    'Every account uses a second step. You will need your authenticator app or your passkey after your password.',
  'auth.signIn.emailLabel': 'Email address',
  'auth.signIn.passwordLabel': 'Password',
  'auth.signIn.passwordHint': 'Paste from a password manager if you use one — it works here.',
  'auth.signIn.submit': 'Continue',
  'auth.signIn.forgot': 'I have lost access to my second step',
  'auth.signIn.noAccount': 'Setting up a new organization?',
  'auth.signIn.createAccount': 'Create an organization',

  'auth.error.credentials': 'That email address and password did not match an account.',
  'auth.error.locked':
    'Too many attempts have been made against this address. Try again in about fifteen minutes. Nothing is wrong with your account.',
  'auth.error.expired': 'That step took too long and has expired. Please start again.',
  'auth.error.code': 'That code was not accepted. Signing in again will send you a fresh one to answer.',
  'auth.error.method': 'That verification method is not available on this account.',

  'auth.notice.created': 'Your organization is ready. Sign in to set up your second step.',
  'auth.notice.joined': 'You have joined the organization. Sign in to set up your second step.',
  'auth.notice.enrolled': 'That step is set up. Sign in with it now.',
  'auth.notice.recovered':
    'Your recovery code was accepted and your old second step has been removed. Sign in to set up a new one.',
  'auth.notice.ended.idle': 'You were signed out after a period of inactivity.',
  'auth.notice.ended.absolute': 'Your session reached its time limit and you were signed out.',
  'auth.notice.ended.revoked': 'Your access to this account was changed, so you were signed out.',

  'auth.verify.title': 'Your second step',
  'auth.verify.lede': 'Enter the current code from your authenticator app.',
  'auth.verify.codeLabel': 'Six-digit code',
  'auth.verify.codeHint': 'Spaces are fine. Pasting is fine.',
  'auth.verify.submit': 'Verify and sign in',
  'auth.verify.usePasskey': 'Use a passkey instead',
  'auth.verify.useApp': 'Use an authenticator app instead',
  'auth.verify.passkeyBody':
    'Confirm with the passkey stored on this device. In this preview build there is no real device prompt, so the confirmation is a single button.',
  'auth.verify.passkeySubmit': 'Confirm with passkey',
  'auth.verify.lost': 'I do not have my second step',

  'auth.enrol.title': 'Set up your second step',
  'auth.enrol.lede':
    'Two ways in, so that losing one device does not lock you out. Set up an authenticator app now; you can add a passkey afterwards.',
  'auth.enrol.chooseTotp': 'Set up an authenticator app',
  'auth.enrol.choosePasskey': 'Set up a passkey',
  'auth.enrol.totpStep1':
    'Add this account to your authenticator app, either by scanning the code or by typing the key below.',
  'auth.enrol.totpManualLabel': 'Setup key',
  'auth.enrol.totpUriLabel': 'Full setup link',
  'auth.enrol.totpStep2': 'Then enter the six-digit code your app is showing.',
  'auth.enrol.confirmLabel': 'Six-digit code',
  'auth.enrol.confirm': 'Confirm',
  'auth.enrol.passkeyBody':
    'A passkey uses this device to prove it is you. In this preview build the browser prompt is stood in for by a button.',
  'auth.enrol.passkeyConfirm': 'Create the passkey',
  'auth.enrol.qrAlt': 'Setup code for your authenticator app. The same key is written out below in text.',

  'auth.recover.title': 'Use a recovery code',
  'auth.recover.lede':
    'If you no longer have your authenticator app or passkey, one of the recovery codes you saved will let you set up a new one. Each code works once.',
  'auth.recover.emailLabel': 'Email address',
  'auth.recover.codeLabel': 'Recovery code',
  'auth.recover.submit': 'Use this code',
  'auth.recover.error.code': 'That code was not accepted.',
  'auth.recover.error.locked': 'Too many attempts have been made against this address. Try again shortly.',
  'auth.recover.noCodes':
    'If you do not have a recovery code either, an administrator in your organization can remove your access and invite you again.',

  'auth.signOut': 'Sign out',
  'auth.signOutEverywhere': 'Sign out everywhere',

  'auth.timeout.heading': 'You will be signed out shortly',
  'auth.timeout.body': 'This session is about to time out for inactivity. Nothing you have saved will be lost.',
  'auth.timeout.extend': 'Keep me signed in',

  'account.title': 'Your account',
  'account.lede': 'Your sign-in, your second steps and the organizations you belong to.',
  'account.organizations': 'Organizations',
  'account.security.link': 'Sign-in and security',
  'account.security.title': 'Sign-in and security',
  'account.security.lede':
    'How you prove it is you, and where you are currently signed in.',
  'account.factors.heading': 'Your second steps',
  'account.factors.none': 'You have not set up a second step yet.',
  'account.factors.one':
    'You have one second step. Adding a second one means losing a device does not lock you out — which is why we ask for two.',
  'account.factors.totp': 'Authenticator app',
  'account.factors.passkey': 'Passkey',
  'account.factors.enrolledAt': 'Added',
  'account.factors.lastUsed': 'Last used',
  'account.factors.neverUsed': 'Not used yet',
  'account.recovery.heading': 'Recovery codes',
  'account.recovery.body':
    'Ten single-use codes. Save them somewhere you can reach without this device. We keep only the date they were issued, never the codes themselves.',
  'account.recovery.issue': 'Generate new codes',
  'account.recovery.issuedOn': 'Codes were last generated on {date}.',
  'account.recovery.never': 'You have not generated recovery codes yet.',
  'account.recovery.shownOnce':
    'These are shown once. Save them now — this page cannot show them again, because we do not keep them.',
  'account.sessions.heading': 'Where you are signed in',
  'account.sessions.current': 'This device',
  'account.sessions.startedAt': 'Started',
  'account.sessions.lastSeen': 'Last active',
  'account.sessions.unknownClient': 'Unrecognized browser',

  'signUp.title': 'Create an organization',
  'signUp.lede':
    'This sets up your organization and makes you its first administrator. You can invite colleagues straight afterwards.',
  'signUp.orgSection': 'Your organization',
  'signUp.personSection': 'You',
  'signUp.orgName': 'Legal name of the organization',
  'signUp.orgNameHint': 'The name as it appears on your incorporation or registration documents.',
  'signUp.orgType': 'What kind of organization is it?',
  'signUp.band': 'How many employees?',
  'signUp.bandHint': 'A range is all we store. We never record an exact headcount.',
  'signUp.jurisdiction': 'Province or territory',
  'signUp.yourName': 'Your name',
  'signUp.email': 'Your email address',
  'signUp.password': 'Choose a password',
  'signUp.passwordHint':
    'At least twelve characters. A short phrase you will remember beats a short password you will not. Password managers are welcome.',
  'signUp.marketing': 'Send me occasional email about this service. Optional, and separate from account email.',
  'signUp.submit': 'Create the organization',
  'signUp.haveAccount': 'Already have an account?',
  'signUp.error.details': 'Some of these details were not accepted. Check the fields below.',
  'signUp.error.password_too_short': 'That password is shorter than twelve characters.',
  'signUp.error.password_too_long': 'That password is longer than we can accept.',
  'signUp.error.password_contains_personal_detail':
    'That password contains your name, your address or your organization’s name, which makes it easy to guess.',
  'signUp.check.title': 'Check your email',
  'signUp.check.body':
    'If that address can be used to create an organization, there is now a message in the inbox explaining what to do next.',

  'orgType.private_school': 'Private school',
  'orgType.childcare': 'Childcare',
  'orgType.care_provider': 'Care provider',
  'orgType.nonprofit': 'Non-profit',
  'orgType.association': 'Association',
  'orgType.professional_services': 'Professional services',
  'orgType.other': 'Something else',

  'org.title': 'Organization',
  'org.lede': 'What we hold about your organization, and who can change it.',
  'org.save': 'Save changes',
  'org.saved': 'Saved.',
  'org.error.details': 'Some of these details were not accepted.',
  'org.teamLink': 'People and access',

  'team.title': 'People and access',
  'team.lede':
    'Who can see and do what. Changes take effect immediately — removing someone ends the sessions they already have.',
  'team.invite.heading': 'Invite someone',
  'team.invite.email': 'Their email address',
  'team.invite.role': 'What should they be able to do?',
  'team.invite.submit': 'Send invitation',
  'team.invited': 'Invitation sent.',
  'team.revoked': 'Invitation revoked.',
  'team.updated': 'Role updated.',
  'team.removed': 'Access removed, and their sessions ended.',
  'team.members.heading': 'Members',
  'team.members.role': 'Role',
  'team.members.joined': 'Joined',
  'team.members.change': 'Change',
  'team.members.remove': 'Remove from organization',
  'team.pending.heading': 'Pending invitations',
  'team.pending.none': 'No invitations are waiting.',
  'team.pending.sent': 'Sent',
  'team.pending.expires': 'Expires',
  'team.pending.revoke': 'Revoke',
  'team.state.pending': 'Waiting',
  'team.state.expired': 'Expired',
  'team.state.revoked': 'Revoked',
  'team.state.accepted': 'Accepted',
  'team.error.last_admin':
    'That would leave the organization with no administrator, and nobody able to invite one. Make someone else an administrator first.',
  'team.error.role': 'You cannot give someone a role you do not have the standing to give.',
  'team.error.details': 'Those details were not accepted.',
  'team.localLink.heading': 'Invitation link (local build only)',
  'team.localLink.body':
    'This build has no mail server, so nothing was actually sent. Open this link, or paste it to the person you invited, to try the acceptance flow.',

  'role.client_admin': 'Administrator',
  'role.client_admin.description': 'Manages people, evidence and the organization’s details.',
  'role.client_contributor': 'Contributor',
  'role.client_contributor.description': 'Uploads evidence and works on findings. No billing, no user management.',
  'role.client_executive': 'Executive',
  'role.client_executive.description': 'Sees released reporting and approves scope. Not the working detail.',
  'role.contractor': 'Specialist',
  'role.internal_pm': 'Delivery manager',
  'role.qualified_reviewer': 'Qualified reviewer',
  'role.platform_admin': 'Platform administrator',

  'join.title': 'Join {organization}',
  'join.lede': 'You have been invited as {role}. Set a password and you are in.',
  'join.existing': 'This address already has an account. Enter its password to accept the invitation.',
  'join.emailLabel': 'Email address',
  'join.emailFixed': 'The invitation was sent to this address and can only be accepted with it.',
  'join.nameLabel': 'Your name',
  'join.passwordLabel': 'Choose a password',
  'join.submit': 'Accept invitation',
  'join.invalid.title': 'This invitation cannot be used',
  'join.invalid.unknown': 'We do not recognize this invitation link.',
  'join.invalid.expired': 'This invitation has expired. Ask an administrator to send a new one.',
  'join.invalid.revoked': 'This invitation was withdrawn.',
  'join.invalid.accepted': 'This invitation has already been used.',
  'join.error.address': 'This invitation can only be accepted by the address it was sent to.',
  'join.error.invalid': 'This invitation can no longer be used.',
  'join.error.details': 'Those details were not accepted.',

  'demo.heading': 'Demo accounts (local build only)',
  'demo.body':
    'This build is running against the in-memory identity provider, so these accounts exist only on this machine. Sign in with any of them and the password below, then set up an authenticator app.',
  'demo.password': 'Password for every demo account',
  'demo.totpHint':
    'There is no real authenticator app here either: the setup screen prints a key you can paste into one, and the current code is shown alongside it.',
  'demo.currentCode': 'Current code',
} satisfies Dictionary;

const fr = {
  'site.name': 'Project Northstar',
  'site.tagline': "Préparation à la LAPHO, structurée autour des preuves.",
  'nav.skipToContent': 'Aller au contenu principal',
  'nav.mainLabel': 'Principal',
  'nav.languageLabel': 'Langue',
  'nav.switchToFrench': 'Français',
  'nav.switchToEnglish': 'English',
  'footer.legal':
    "Project Northstar est un titre de travail. Ce service organise les preuves et coordonne un examen qualifié. Il ne certifie pas votre organisation et ne constitue pas un avis juridique.",
  'status.foundation.heading': 'Tranche de fondation (CC-01)',
  'status.foundation.body':
    "Ce déploiement correspond à la fondation CC-01 : jetons de conception, composants accessibles, isolation des locataires, journal d'audit et modèle de contenu. L'expérience publique est construite dans CC-02.",
  'translation.missing.heading': "Ce contenu n'est pas encore disponible en français",
  'translation.missing.body':
    "Nous affichons la version anglaise ci-dessous plutôt qu'une traduction automatique. La formulation réglementaire est traduite par un réviseur qualifié avant publication.",
  'claim.hold.heading': "Cette information est en cours de révision",
  'claim.hold.body':
    "Nous vérifions à nouveau cette déclaration par rapport à sa source et ne l'affichons pas tant que cette révision n'est pas terminée. La source officielle est indiquée ci-dessous.",
  'claim.source': 'Source',
  'claim.lastReviewed': 'Dernière vérification',
  'nav.checkReadiness': 'Évaluer votre préparation',
  'nav.howItWorks': 'Comment ça fonctionne',
  'nav.resources': 'Ressources',
  'resources.eyebrow': 'Ressources',
  'resources.title': 'Quelques lectures utiles',
  'resources.lede':
    "Des textes courts et précis sur la façon dont ce travail se fait réellement. Nous préférons en publier trois utiles plutôt que trente superficiels : la liste est donc volontairement courte.",
  'resources.kind.guide': 'Guide',
  'resources.kind.checklist': 'Liste de vérification',
  'resources.kind.explainer': 'Explication',
  'resources.minutes': 'Lecture de {n} minutes',
  'resources.updated': 'Mise à jour',
  'resources.backToIndex': 'Toutes les ressources',
  'resources.qa.done': "Accessibilité de cette page vérifiée par {name} le {date}.",
  'resources.qa.missing':
    "Cette page n'a pas encore fait l'objet d'une vérification manuelle d'accessibilité par un réviseur nommé. Les vérifications automatisées réussissent, mais nous ne les considérons pas comme une révision.",
  'resources.home.heading': 'Lectures utiles',
  'resources.home.lede': "Comment ce travail se fait réellement, écrit par ceux qui le font.",
  'resources.home.cta': 'Toutes les ressources',
  'nav.services': 'Services',
  'footer.exploreHeading': 'Explorer',
  'footer.positionHeading': 'Notre position',
  'footer.workingTitle': "Project Northstar est un titre de travail, sans vérification de marque de commerce. Les prix affichés sont indicatifs.",
  'nav.contact': 'Parler à une personne',
  'consent.heading': 'Statistiques de ce site',
  'consent.body':
    "Nous aimerions mesurer l'utilisation de ce site afin de l'améliorer. Rien n'est chargé avant votre choix, et le site fonctionne exactement de la même façon dans les deux cas. Vous pouvez changer d'avis à tout moment.",
  'consent.accept': 'Autoriser les statistiques',
  'consent.decline': 'Aucune statistique',
  'qualifier.start.heading': 'Évaluer votre préparation',
  'qualifier.start.body':
    "Quelques questions simples sur votre organisation. À la fin, nous suggérons une prochaine étape raisonnable et vous montrons comment nous y sommes arrivés.",
  'qualifier.start.point.questions': '{count} questions, une à la fois.',
  'qualifier.start.point.noAccount': "Aucun compte requis. Vous pouvez enregistrer votre progression et revenir.",
  'qualifier.start.point.notLegal':
    "Il s'agit d'un outil d'orientation, et non d'un avis juridique. Il ne vous dira pas si vous satisfaites à une exigence.",
  'qualifier.start.cta': 'Commencer',
  'qualifier.start.humanPath': 'Passer cette étape et parler à une personne',
  'qualifier.progressLabel': 'Questions de préparation',
  'qualifier.next': 'Continuer',
  'qualifier.back': 'Retour',
  'qualifier.finish': 'Voir ma prochaine étape suggérée',
  'qualifier.error.prefix': 'Erreur :',
  'qualifier.error.required':
    "Choisissez une réponse pour continuer. Si aucune ne convient, choisissez celle qui se rapproche le plus de votre situation.",
  'qualifier.error.invalid': "Cette réponse ne faisait pas partie des options. Veuillez choisir de nouveau.",
  'qualifier.error.resume': "Saisissez une adresse courriel et cochez la case pour nous autoriser à vous écrire.",
  'qualifier.resume.summary': 'Enregistrer ma progression et revenir plus tard',
  'qualifier.resume.body':
    "Vos réponses sont déjà enregistrées sur cet appareil. Si vous souhaitez aussi recevoir un lien par courriel, indiquez-nous où l'envoyer.",
  'qualifier.resume.emailLabel': 'Adresse courriel',
  'qualifier.resume.consent': 'Oui, envoyez-moi un lien par courriel pour revenir à ces réponses.',
  'qualifier.resume.cta': 'M’envoyer un lien',
  'qualifier.resume.saved': "Enregistré. Nous avons noté votre adresse et enverrons le lien.",
  'result.heading': 'Votre prochaine étape suggérée',
  'result.category.likely_self_serve': "Vous n'avez peut-être pas besoin de nous",
  'result.category.assessment_fit': 'Une évaluation de préparation convient',
  'result.category.specialist_fit': 'Un travail spécialisé convient',
  'result.category.uncertain': 'Une personne doit examiner ceci',
  'result.body.likely_self_serve':
    "D'après ce que vous nous avez dit, les directives officielles suffiront probablement. Nous préférons vous le dire plutôt que de vous vendre quelque chose d'inutile.",
  'result.body.assessment_fit':
    "Une évaluation de préparation vous indiquerait quelles preuves vous détenez déjà, ce qui manque et par quoi commencer.",
  'result.body.specialist_fit':
    "Vous savez déjà à peu près où vous en êtes ; une évaluation générale répéterait ce que vous savez. Un travail spécialisé est un meilleur point de départ.",
  'result.body.uncertain':
    "Vos réponses ne pointent pas clairement dans une direction. Nous ne devinerons pas. Un réviseur qualifié devrait examiner la situation avant toute recommandation.",
  'result.why.heading': 'Pourquoi nous suggérons ceci',
  'result.ruleVersion': 'Version des règles',
  'result.uncertainty.heading': "Ce que ceci n'est pas",
  'result.talkToSomeone': 'Organiser une conversation',
  'result.official.heading': 'La voie officielle',
  'result.official.body':
    "Le gouvernement publie lui-même ces directives, gratuitement. Si elles répondent à votre question, utilisez-les : c'est un bon résultat.",
  'result.changeAnswers': 'Modifier mes réponses',
  'contact.heading': 'Parler à une personne',
  'contact.body':
    "Vous n'avez aucune question à remplir au préalable. Joignez-nous comme il vous convient et dites-nous ce que vous voulez.",
  'contact.phoneLabel': 'Téléphone',
  'contact.emailLabel': 'Courriel',
  'contact.relayLabel': 'Relais et ATS',
  'contact.relayBody':
    "Nous acceptons les appels par relais, y compris le Service de relais Bell. Indiquez notre numéro à l'opérateur.",
  'contact.accommodationLabel': "Mesures d'adaptation",
  'contact.accommodationBody':
    "Dites-nous comment vous préférez communiquer et nous procéderons ainsi. Si vous avez besoin de documents dans un autre format, demandez-le.",
  'contact.noPressure': "Nous ne vous ajouterons pas à une liste de diffusion parce que vous nous avez contactés.",
  'rateLimit.heading': 'Trop de demandes provenant de votre connexion',
  'rateLimit.body':
    "Nous limitons la fréquence d'envoi de ce formulaire depuis une même connexion, afin d'éviter les abus. Vous avez atteint cette limite.",
  'rateLimit.retry': 'Veuillez réessayer dans environ {minutes} minute(s).',
  'rateLimit.noPuzzle':
    "Nous ne vous demanderons pas de résoudre une énigme ni de prouver que vous êtes une personne. Si vous devez continuer maintenant, contactez-nous et quelqu'un vous aidera.",
  'rateLimit.contact': 'Parler à une personne maintenant',

  // ---- Page d'accueil : hero ----
  'hero.eyebrow': "Préparation à l'accessibilité en Ontario",
  'hero.title.lead': "Sachez ce qui s'applique à vous,",
  'hero.title.emphasis': 'et quoi faire',
  'hero.title.tail': ' ensuite.',
  'hero.factsLabel': "Comment le travail est encadré",
  'hero.fact.reviewed.label': 'Chaque conclusion',
  'hero.fact.reviewed.value': 'Signée par un réviseur qualifié nommé',
  'hero.fact.delivered.label': 'Réalisé par',
  'hero.fact.delivered.value': 'Des spécialistes vérifiés, mandat par mandat',
  'hero.fact.tested.label': 'Testé par',
  'hero.fact.tested.value': 'Un panel rémunéré de personnes handicapées',
  'hero.lede':
    "Nous aidons les organisations ontariennes à déterminer quelles exigences d'accessibilité sont probablement visées, quelles preuves elles détiennent déjà et par quoi commencer — chaque conclusion technique étant révisée par une personne qualifiée.",
  'hero.primaryCta': 'Évaluer votre préparation',
  'hero.secondaryCta': 'Voir comment se déroule la prestation',
  'hero.reassurance': "Huit questions. Aucun compte. Nous vous dirons si vous n'avez pas besoin de nous.",
  'hero.band.under_20': "Vous nous avez indiqué moins de 20 employés. Une grande partie de ce qui suit pourrait ne pas s'appliquer à vous — nous le disons clairement ci-dessous.",
  'hero.band.20_to_49': "Vous nous avez indiqué de 20 à 49 employés. Les obligations de déclaration et de politique sont généralement le point de départ.",
  'hero.band.50_to_199': "Vous nous avez indiqué de 50 à 199 employés. À cette taille, les exigences relatives au site Web et aux documents comptent généralement autant que la déclaration.",
  'hero.band.200_plus': "Vous nous avez indiqué 200 employés ou plus. Prévoyez une portée plus large et davantage de coordination interne qu'une organisation plus petite.",

  // ---- Page d'accueil : sélecteur de taille ----
  'band.eyebrow': 'Votre organisation',
  'band.heading': 'Quelle est la taille de votre organisation ?',
  'band.lede':
    "La taille change les exigences susceptibles de s'appliquer. Indiquez-la et nous vous orienterons vers les parties pertinentes — rien n'est masqué dans un cas comme dans l'autre, et vous pouvez modifier ce choix à tout moment.",
  'band.under_20': 'Moins de 20 employés',
  'band.20_to_49': 'De 20 à 49 employés',
  'band.50_to_199': 'De 50 à 199 employés',
  'band.200_plus': '200 employés ou plus',
  'band.note.under_20': "Le moins d'obligations",
  'band.note.20_to_49': "La déclaration s'applique généralement",
  'band.note.50_to_199': 'La taille la plus courante chez nos clients',
  'band.note.200_plus': 'Portée plus large, plus de coordination',
  'band.confirmation': "Directives affichées pour : {band}. Tout le reste du site demeure accessible.",

  // ---- Page d'accueil : offres ----
  'offers.eyebrow': 'Ce que nous faisons',
  'offers.heading': 'Des mandats délimités, avec les exclusions énoncées d’emblée.',
  'offers.lede':
    "Chaque mandat précise ce que vous obtenez, le coût, les délais, ce dont nous avons besoin de votre part et ce qui n'est pas couvert. Si un mandat ne vous convient pas, nous préférons que vous le sachiez avant de payer.",
  'offers.indicative': 'indicatif',
  'offers.custom': 'Délimité par mandat',
  'offers.includes': 'Comprend',
  'offers.timing': 'Délais',
  'offers.inputs': 'Ce dont nous avons besoin',
  'offers.excludes': 'Non compris',
  'offers.priceNote':
    "Les prix sont indicatifs et sont confirmés dans une portée écrite avant le début des travaux. Rien sur cette page ne constitue une soumission.",

  'offer.readiness_assessment.name': 'Évaluation de préparation 2026',
  'offer.readiness_assessment.outcome': "Transformer une inquiétude vague en un portrait écrit de votre situation réelle.",
  'offer.readiness_assessment.includes': "Collecte structurée, examen de 60 minutes, aperçu des preuves, carte des priorités et portée recommandée.",
  'offer.readiness_assessment.timing': 'Environ deux semaines après la collecte.',
  'offer.readiness_assessment.inputs': "Un court appel et l'accès aux politiques et dossiers que vous détenez déjà.",
  'offer.readiness_assessment.excludes': "Aucun travail de correction, aucun audit de site Web et aucun dépôt en votre nom.",

  'offer.core_readiness.name': 'Forfait de préparation de base',
  'offer.core_readiness.outcome': 'Combler les lacunes des documents, des dossiers de formation et des politiques.',
  'offer.core_readiness.includes': "Examen des politiques et des preuves, matrice des exigences, registre d'actions et sommaire exécutif.",
  'offer.core_readiness.timing': 'De quatre à six semaines.',
  'offer.core_readiness.inputs': "Un responsable désigné chez vous et du temps de la part des détenteurs des dossiers.",
  'offer.core_readiness.excludes': "Aucune modification du code du site Web ni correction de documents — ce sont des mandats distincts.",

  'offer.digital_readiness.name': 'Forfait de préparation numérique',
  'offer.digital_readiness.outcome': "Donner à votre équipe Web une liste priorisée et reproductible de ce qu'il faut corriger.",
  'offer.digital_readiness.includes': "Audit manuel par échantillon réalisé par un auditeur qualifié, registre priorisé des problèmes, atelier de correction et allocation de nouveaux tests.",
  'offer.digital_readiness.timing': "De quatre à huit semaines selon la taille du site.",
  'offer.digital_readiness.inputs': "Un environnement de test et une personne pouvant répondre aux questions sur le site.",
  'offer.digital_readiness.excludes': "Nous ne modifions pas votre système de production. Les correctifs sont réalisés par votre équipe ou dans le cadre d'un mandat de correction distinct.",

  'offer.remediation_management.name': 'Gestion des corrections',
  'offer.remediation_management.outcome': "Retirer le fardeau de la coordination à votre équipe.",
  'offer.remediation_management.includes': "Recherche de spécialistes, gestion de projet, assurance qualité, contrôle des changements et transfert vérifié.",
  'offer.remediation_management.timing': 'Délimité par mandat.',
  'offer.remediation_management.inputs': "Un pouvoir décisionnel et un point de contact régulier.",
  'offer.remediation_management.excludes': "Nous n'acceptons aucun travail en dehors d'un ordre de modification convenu.",

  'offer.care_plan.name': "Plan d'entretien en accessibilité",
  'offer.care_plan.outcome': 'Empêcher les mêmes problèmes de revenir.',
  'offer.care_plan.includes': "Vérifications planifiées, soutien au contenu, mise à jour des politiques, rappels de formation et tableau de bord.",
  'offer.care_plan.timing': "Mensuel, résiliable avec un préavis de 30 jours.",
  'offer.care_plan.inputs': "Une personne qui reçoit le sommaire mensuel et peut y donner suite.",
  'offer.care_plan.excludes': "Ne remplace pas un audit lorsque votre site change de façon importante.",

  // ---- Page d'accueil : méthode ----
  'method.eyebrow': 'Comment ça fonctionne',
  'method.heading': 'Quatre étapes, et vous voyez où vous en êtes dans chacune.',
  'method.lede': "La même structure chaque fois, que le mandat dure deux semaines ou six mois.",
  'method.understand.name': 'Comprendre',
  'method.understand.body': "Déterminer ce qui est susceptible de s'appliquer à votre organisation, et écrire pourquoi. Un réviseur qualifié le confirme avant toute soumission.",
  'method.evidence.name': 'Rassembler les preuves',
  'method.evidence.body': "Réunir au même endroit ce que vous détenez déjà, voir ce qui manque et cesser de deviner pour le reste.",
  'method.remediate.name': 'Corriger',
  'method.remediate.body': "Corriger d'abord ce qui compte, avec des étapes de reproduction et des critères d'acceptation exploitables par votre équipe. Les spécialistes sont sélectionnés selon des compétences vérifiées et leur disponibilité.",
  'method.maintain.name': 'Maintenir',
  'method.maintain.body': "Des vérifications planifiées et une révision du contenu pour que les mêmes lacunes ne réapparaissent pas au prochain changement de votre site ou de vos politiques.",

  // ---- Page d'accueil : confiance ----
  'trust.eyebrow': 'Notre façon de travailler',
  'trust.heading': 'Les engagements que nous nous imposons.',
  'trust.lede': "Ce sont des politiques, et non des promesses de résultats. Vous pouvez nous y tenir.",
  'trust.review.name': 'Une personne qualifiée signe chaque conclusion',
  'trust.review.body': "Aucune constatation d'audit ni interprétation des exigences ne vous parvient sans un réviseur nommé. Les conclusions à risque élevé exigent une deuxième personne, et le réviseur n'est jamais l'auteur du travail.",
  'trust.credentials.name': 'Les spécialistes sont vérifiés avant de toucher à votre dossier',
  'trust.credentials.body': "Nous vérifions les titres, les références, les assurances et les conflits, et chaque spécialiste réalise un mandat d'étalonnage rémunéré avant tout travail client réel.",
  'trust.security.name': 'Vos preuves sont manipulées avec soin',
  'trust.security.body': "Les fichiers sont analysés avant que quiconque puisse les ouvrir, l'accès est limité au mandat précis et expire automatiquement, et chaque téléchargement est consigné.",
  'trust.livedExperience.name': 'Des personnes handicapées sont rémunérées pour tester ceci',
  'trust.livedExperience.body': "Un panel permanent de personnes ayant divers handicaps et technologies d'assistance teste notre produit et nos livrables. La participation est rémunérée. Ce n'est pas du bénévolat.",
  'trust.boundaries.name': 'Nous disons ce que nous ne sommes pas',
  'trust.boundaries.body': "Nous ne sommes affiliés à aucun gouvernement. Nous ne pouvons pas certifier votre organisation ni déposer en votre nom, et aucun rapport que nous rédigeons ne constitue un avis juridique. Votre signataire autorisé demeure responsable de ce que votre organisation déclare.",

  // ---- Page d'accueil : preuves (état vide) ----
  'proof.eyebrow': 'Preuves',
  'proof.heading': "Nous n'avons pas encore publié d'études de cas.",
  'proof.body':
    "C'est ici que figureront les récits avant-après : la contrainte, ce qui a été fait et le résultat mesuré. Nous n'allons pas remplir l'espace avec des citations anonymes entre-temps — sur un site qui parle de fiabilité, ce serait la mauvaise chose à simuler.",
  'proof.invitation':
    "Nous travaillons d'abord avec un petit nombre de partenaires de conception. Si vous souhaitez voir le format réel du livrable avant de vous engager, demandez-le et nous vous montrerons un exemple caviardé.",
  'proof.cta': 'Demander à voir un exemple',

  // ---- Page d'accueil : appel à l'action final ----
  'finalCta.heading': 'Par où souhaitez-vous commencer ?',
  'finalCta.lede': "Les questions prennent quelques minutes et ne coûtent rien. Si vous préférez simplement parler à quelqu'un, c'est un aussi bon point de départ.",
  'finalCta.primary': 'Évaluer votre préparation',
  'finalCta.secondary': 'Parler à une personne',

  // ---- Page « Comment ça fonctionne » ----
  'howItWorks.title': 'Comment se déroule la prestation',
  'howItWorks.lede':
    "Qui fait le travail, ce qui l'encadre et ce que nous vous demandons. Si quelque chose ne correspond pas au fonctionnement de votre organisation, mieux vaut le savoir maintenant.",
  'howItWorks.network.heading': 'Un réseau de spécialistes sélectionnés, pas une place de marché',
  'howItWorks.network.body':
    "Le travail est réalisé par des spécialistes vérifiés : conseillers en accessibilité de l'Ontario, auditeurs manuels certifiés, développeurs front-end et spécialistes des documents accessibles. Ils sont choisis selon des compétences vérifiées, leur capacité, la langue et l'absence de conflits — jamais en faisant baisser le prix de votre mandat. Les contractuels ne voient que les preuves nommées dans leur mandat, et cet accès expire à la clôture.",
  'howItWorks.quality.heading': "Ce qui empêche un mauvais livrable de vous parvenir",
  'howItWorks.quality.body':
    "Rien n'est diffusé tant qu'une exception qualité est ouverte, qu'un réviseur n'est pas nommé ou qu'une source citée a dépassé sa date de révision. C'est le système qui l'applique, pas la mémoire de quelqu'un. Les conclusions à risque élevé exigent un deuxième réviseur qualifié, et l'auteur du travail ne peut pas l'approuver.",
  'howItWorks.security.heading': 'Comment vos preuves sont manipulées',
  'howItWorks.security.body':
    "Les téléversements vont directement en quarantaine et sont analysés avant que quiconque puisse les ouvrir. Les fichiers ne sont jamais servis par un lien ordinaire : chaque téléchargement passe par une adresse à durée de vie courte, émise après une vérification des permissions et consignée dans un journal d'audit que vous pouvez consulter. Votre organisation peut tout exporter et demander une suppression vérifiée.",
  'howItWorks.accessibility.heading': 'Notre propre accessibilité',
  'howItWorks.accessibility.body':
    "Nous visons le niveau AA des WCAG 2.2 pour ce site, le portail client et les rapports que nous produisons. Des vérifications automatisées s'exécutent à chaque changement, mais elles ne closent jamais un point d'accessibilité à elles seules : une personne nommée teste au clavier, au lecteur d'écran et à fort grossissement avant chaque version. Un audit indépendant, mené par une personne qui n'a pas participé à la construction, a lieu avant le lancement.",
  'howItWorks.responsibilities.heading': 'Ce dont nous avons besoin de votre part',
  'howItWorks.responsibilities.body':
    "Un responsable nommé pouvant décider, l'accès aux dossiers que vous détenez déjà et une personne pouvant répondre aux questions sur votre site Web. Les mandats prennent surtout du retard parce que la collecte des preuves est plus longue que prévu — nous vous le dirons tôt si cela se produit.",
  'howItWorks.limits.heading': 'Ce que nous ne ferons pas',
  'howItWorks.limits.body':
    "Nous ne vous dirons pas que vous avez terminé. Nous ne déposons rien en votre nom, nous ne sommes affiliés à aucun gouvernement et rien de ce que nous produisons ne constitue un avis juridique. Si vous cherchez un widget de superposition, nous ne sommes pas le bon fournisseur — ces outils ne corrigent pas un contenu inaccessible.",

  /* ---- Comptes et accès (CC-03a) ------------------------------------- */

  'nav.signIn': 'Se connecter',
  'nav.account': 'Votre compte',

  'auth.signIn.title': 'Connexion',
  'auth.signIn.lede':
    'Chaque compte comporte une deuxième étape. Après votre mot de passe, vous aurez besoin de votre application d’authentification ou de votre clé d’accès.',
  'auth.signIn.emailLabel': 'Adresse courriel',
  'auth.signIn.passwordLabel': 'Mot de passe',
  'auth.signIn.passwordHint':
    'Vous pouvez coller depuis un gestionnaire de mots de passe — cela fonctionne ici.',
  'auth.signIn.submit': 'Continuer',
  'auth.signIn.forgot': 'J’ai perdu l’accès à ma deuxième étape',
  'auth.signIn.noAccount': 'Vous créez une nouvelle organisation ?',
  'auth.signIn.createAccount': 'Créer une organisation',

  'auth.error.credentials': 'Cette adresse courriel et ce mot de passe ne correspondent à aucun compte.',
  'auth.error.locked':
    'Trop de tentatives ont été faites avec cette adresse. Réessayez dans une quinzaine de minutes. Votre compte n’a rien d’anormal.',
  'auth.error.expired': 'Cette étape a pris trop de temps et a expiré. Veuillez recommencer.',
  'auth.error.code':
    'Ce code n’a pas été accepté. En vous reconnectant, vous recevrez une nouvelle demande à laquelle répondre.',
  'auth.error.method': 'Cette méthode de vérification n’est pas disponible pour ce compte.',

  'auth.notice.created': 'Votre organisation est prête. Connectez-vous pour configurer votre deuxième étape.',
  'auth.notice.joined': 'Vous avez rejoint l’organisation. Connectez-vous pour configurer votre deuxième étape.',
  'auth.notice.enrolled': 'Cette étape est configurée. Connectez-vous avec elle maintenant.',
  'auth.notice.recovered':
    'Votre code de récupération a été accepté et votre ancienne deuxième étape a été supprimée. Connectez-vous pour en configurer une nouvelle.',
  'auth.notice.ended.idle': 'Vous avez été déconnecté après une période d’inactivité.',
  'auth.notice.ended.absolute': 'Votre session a atteint sa durée maximale et vous avez été déconnecté.',
  'auth.notice.ended.revoked': 'Votre accès à ce compte a été modifié, vous avez donc été déconnecté.',

  'auth.verify.title': 'Votre deuxième étape',
  'auth.verify.lede': 'Saisissez le code actuel affiché par votre application d’authentification.',
  'auth.verify.codeLabel': 'Code à six chiffres',
  'auth.verify.codeHint': 'Les espaces ne posent pas de problème. Le collage non plus.',
  'auth.verify.submit': 'Vérifier et se connecter',
  'auth.verify.usePasskey': 'Utiliser plutôt une clé d’accès',
  'auth.verify.useApp': 'Utiliser plutôt une application d’authentification',
  'auth.verify.passkeyBody':
    'Confirmez avec la clé d’accès enregistrée sur cet appareil. Dans cette version préliminaire, il n’y a pas de véritable invite système : la confirmation tient en un bouton.',
  'auth.verify.passkeySubmit': 'Confirmer avec la clé d’accès',
  'auth.verify.lost': 'Je n’ai pas ma deuxième étape',

  'auth.enrol.title': 'Configurer votre deuxième étape',
  'auth.enrol.lede':
    'Deux façons d’entrer, pour que la perte d’un appareil ne vous bloque pas. Configurez d’abord une application d’authentification ; vous pourrez ajouter une clé d’accès ensuite.',
  'auth.enrol.chooseTotp': 'Configurer une application d’authentification',
  'auth.enrol.choosePasskey': 'Configurer une clé d’accès',
  'auth.enrol.totpStep1':
    'Ajoutez ce compte à votre application d’authentification, en scannant le code ou en saisissant la clé ci-dessous.',
  'auth.enrol.totpManualLabel': 'Clé de configuration',
  'auth.enrol.totpUriLabel': 'Lien de configuration complet',
  'auth.enrol.totpStep2': 'Saisissez ensuite le code à six chiffres affiché par votre application.',
  'auth.enrol.confirmLabel': 'Code à six chiffres',
  'auth.enrol.confirm': 'Confirmer',
  'auth.enrol.passkeyBody':
    'Une clé d’accès utilise cet appareil pour prouver votre identité. Dans cette version préliminaire, l’invite du navigateur est remplacée par un bouton.',
  'auth.enrol.passkeyConfirm': 'Créer la clé d’accès',
  'auth.enrol.qrAlt':
    'Code de configuration pour votre application d’authentification. La même clé est écrite en toutes lettres ci-dessous.',

  'auth.recover.title': 'Utiliser un code de récupération',
  'auth.recover.lede':
    'Si vous n’avez plus votre application d’authentification ni votre clé d’accès, l’un des codes de récupération que vous avez conservés vous permettra d’en configurer une nouvelle. Chaque code ne sert qu’une fois.',
  'auth.recover.emailLabel': 'Adresse courriel',
  'auth.recover.codeLabel': 'Code de récupération',
  'auth.recover.submit': 'Utiliser ce code',
  'auth.recover.error.code': 'Ce code n’a pas été accepté.',
  'auth.recover.error.locked':
    'Trop de tentatives ont été faites avec cette adresse. Réessayez sous peu.',
  'auth.recover.noCodes':
    'Si vous n’avez pas non plus de code de récupération, un administrateur de votre organisation peut retirer votre accès puis vous réinviter.',

  'auth.signOut': 'Se déconnecter',
  'auth.signOutEverywhere': 'Se déconnecter partout',

  'auth.timeout.heading': 'Vous allez bientôt être déconnecté',
  'auth.timeout.body':
    'Cette session est sur le point d’expirer pour inactivité. Rien de ce que vous avez enregistré ne sera perdu.',
  'auth.timeout.extend': 'Garder ma session ouverte',

  'account.title': 'Votre compte',
  'account.lede': 'Votre connexion, vos deuxièmes étapes et les organisations dont vous faites partie.',
  'account.organizations': 'Organisations',
  'account.security.link': 'Connexion et sécurité',
  'account.security.title': 'Connexion et sécurité',
  'account.security.lede': 'Comment vous prouvez votre identité, et où vous êtes actuellement connecté.',
  'account.factors.heading': 'Vos deuxièmes étapes',
  'account.factors.none': 'Vous n’avez pas encore configuré de deuxième étape.',
  'account.factors.one':
    'Vous avez une deuxième étape. En ajouter une seconde évite qu’un appareil perdu vous bloque — c’est pourquoi nous en demandons deux.',
  'account.factors.totp': 'Application d’authentification',
  'account.factors.passkey': 'Clé d’accès',
  'account.factors.enrolledAt': 'Ajoutée le',
  'account.factors.lastUsed': 'Dernière utilisation',
  'account.factors.neverUsed': 'Pas encore utilisée',
  'account.recovery.heading': 'Codes de récupération',
  'account.recovery.body':
    'Dix codes à usage unique. Conservez-les à un endroit accessible sans cet appareil. Nous ne gardons que la date d’émission, jamais les codes eux-mêmes.',
  'account.recovery.issue': 'Générer de nouveaux codes',
  'account.recovery.issuedOn': 'Les codes ont été générés pour la dernière fois le {date}.',
  'account.recovery.never': 'Vous n’avez pas encore généré de codes de récupération.',
  'account.recovery.shownOnce':
    'Ils ne sont affichés qu’une fois. Conservez-les maintenant : cette page ne pourra pas les réafficher, car nous ne les conservons pas.',
  'account.sessions.heading': 'Où vous êtes connecté',
  'account.sessions.current': 'Cet appareil',
  'account.sessions.startedAt': 'Ouverte le',
  'account.sessions.lastSeen': 'Dernière activité',
  'account.sessions.unknownClient': 'Navigateur non reconnu',

  'signUp.title': 'Créer une organisation',
  'signUp.lede':
    'Cette étape crée votre organisation et fait de vous son premier administrateur. Vous pourrez inviter vos collègues juste après.',
  'signUp.orgSection': 'Votre organisation',
  'signUp.personSection': 'Vous',
  'signUp.orgName': 'Dénomination légale de l’organisation',
  'signUp.orgNameHint': 'Le nom tel qu’il figure sur vos documents constitutifs ou d’enregistrement.',
  'signUp.orgType': 'De quel type d’organisation s’agit-il ?',
  'signUp.band': 'Combien d’employés ?',
  'signUp.bandHint':
    'Nous ne conservons qu’une tranche. Nous n’enregistrons jamais un effectif exact.',
  'signUp.jurisdiction': 'Province ou territoire',
  'signUp.yourName': 'Votre nom',
  'signUp.email': 'Votre adresse courriel',
  'signUp.password': 'Choisissez un mot de passe',
  'signUp.passwordHint':
    'Au moins douze caractères. Une courte phrase dont vous vous souviendrez vaut mieux qu’un mot de passe court que vous oublierez. Les gestionnaires de mots de passe sont les bienvenus.',
  'signUp.marketing':
    'M’envoyer occasionnellement des courriels au sujet de ce service. Facultatif, et distinct des courriels liés au compte.',
  'signUp.submit': 'Créer l’organisation',
  'signUp.haveAccount': 'Vous avez déjà un compte ?',
  'signUp.error.details': 'Certains de ces renseignements n’ont pas été acceptés. Vérifiez les champs ci-dessous.',
  'signUp.error.password_too_short': 'Ce mot de passe compte moins de douze caractères.',
  'signUp.error.password_too_long': 'Ce mot de passe est plus long que ce que nous pouvons accepter.',
  'signUp.error.password_contains_personal_detail':
    'Ce mot de passe contient votre nom, votre adresse ou le nom de votre organisation, ce qui le rend facile à deviner.',
  'signUp.check.title': 'Consultez votre courriel',
  'signUp.check.body':
    'Si cette adresse peut servir à créer une organisation, un message se trouve maintenant dans la boîte de réception et explique la suite.',

  'orgType.private_school': 'École privée',
  'orgType.childcare': 'Service de garde',
  'orgType.care_provider': 'Prestataire de soins',
  'orgType.nonprofit': 'Organisme sans but lucratif',
  'orgType.association': 'Association',
  'orgType.professional_services': 'Services professionnels',
  'orgType.other': 'Autre',

  'org.title': 'Organisation',
  'org.lede': 'Ce que nous conservons au sujet de votre organisation, et qui peut le modifier.',
  'org.save': 'Enregistrer les modifications',
  'org.saved': 'Enregistré.',
  'org.error.details': 'Certains de ces renseignements n’ont pas été acceptés.',
  'org.teamLink': 'Personnes et accès',

  'team.title': 'Personnes et accès',
  'team.lede':
    'Qui peut voir et faire quoi. Les changements prennent effet immédiatement — retirer une personne met fin aux sessions qu’elle a déjà.',
  'team.invite.heading': 'Inviter une personne',
  'team.invite.email': 'Son adresse courriel',
  'team.invite.role': 'Que devrait-elle pouvoir faire ?',
  'team.invite.submit': 'Envoyer l’invitation',
  'team.invited': 'Invitation envoyée.',
  'team.revoked': 'Invitation révoquée.',
  'team.updated': 'Rôle mis à jour.',
  'team.removed': 'Accès retiré, et ses sessions ont pris fin.',
  'team.members.heading': 'Membres',
  'team.members.role': 'Rôle',
  'team.members.joined': 'Arrivée',
  'team.members.change': 'Modifier',
  'team.members.remove': 'Retirer de l’organisation',
  'team.pending.heading': 'Invitations en attente',
  'team.pending.none': 'Aucune invitation en attente.',
  'team.pending.sent': 'Envoyée',
  'team.pending.expires': 'Expire',
  'team.pending.revoke': 'Révoquer',
  'team.state.pending': 'En attente',
  'team.state.expired': 'Expirée',
  'team.state.revoked': 'Révoquée',
  'team.state.accepted': 'Acceptée',
  'team.error.last_admin':
    'L’organisation se retrouverait sans administrateur, et personne ne pourrait en inviter un. Nommez d’abord un autre administrateur.',
  'team.error.role': 'Vous ne pouvez pas attribuer un rôle que vous n’avez pas qualité pour attribuer.',
  'team.error.details': 'Ces renseignements n’ont pas été acceptés.',
  'team.localLink.heading': 'Lien d’invitation (version locale seulement)',
  'team.localLink.body':
    'Cette version n’a pas de serveur de courriel : rien n’a réellement été envoyé. Ouvrez ce lien, ou transmettez-le à la personne invitée, pour essayer le parcours d’acceptation.',

  'role.client_admin': 'Administrateur',
  'role.client_admin.description':
    'Gère les personnes, les preuves et les renseignements de l’organisation.',
  'role.client_contributor': 'Collaborateur',
  'role.client_contributor.description':
    'Téléverse des preuves et travaille sur les constats. Aucune facturation, aucune gestion des utilisateurs.',
  'role.client_executive': 'Direction',
  'role.client_executive.description':
    'Voit les rapports publiés et approuve la portée. Pas le détail du travail en cours.',
  'role.contractor': 'Spécialiste',
  'role.internal_pm': 'Responsable de prestation',
  'role.qualified_reviewer': 'Réviseur qualifié',
  'role.platform_admin': 'Administrateur de la plateforme',

  'join.title': 'Rejoindre {organization}',
  'join.lede': 'Vous avez été invité à titre de {role}. Choisissez un mot de passe et vous y êtes.',
  'join.existing':
    'Cette adresse possède déjà un compte. Saisissez son mot de passe pour accepter l’invitation.',
  'join.emailLabel': 'Adresse courriel',
  'join.emailFixed':
    'L’invitation a été envoyée à cette adresse et ne peut être acceptée qu’avec celle-ci.',
  'join.nameLabel': 'Votre nom',
  'join.passwordLabel': 'Choisissez un mot de passe',
  'join.submit': 'Accepter l’invitation',
  'join.invalid.title': 'Cette invitation ne peut pas être utilisée',
  'join.invalid.unknown': 'Nous ne reconnaissons pas ce lien d’invitation.',
  'join.invalid.expired': 'Cette invitation a expiré. Demandez à un administrateur d’en envoyer une nouvelle.',
  'join.invalid.revoked': 'Cette invitation a été retirée.',
  'join.invalid.accepted': 'Cette invitation a déjà été utilisée.',
  'join.error.address': 'Cette invitation ne peut être acceptée que par l’adresse à laquelle elle a été envoyée.',
  'join.error.invalid': 'Cette invitation ne peut plus être utilisée.',
  'join.error.details': 'Ces renseignements n’ont pas été acceptés.',

  'demo.heading': 'Comptes de démonstration (version locale seulement)',
  'demo.body':
    'Cette version fonctionne avec le fournisseur d’identité en mémoire : ces comptes n’existent que sur cette machine. Connectez-vous avec l’un d’eux et le mot de passe ci-dessous, puis configurez une application d’authentification.',
  'demo.password': 'Mot de passe de tous les comptes de démonstration',
  'demo.totpHint':
    'Il n’y a pas non plus de véritable application d’authentification ici : l’écran de configuration affiche une clé que vous pouvez coller dans la vôtre, et le code actuel est indiqué à côté.',
  'demo.currentCode': 'Code actuel',
} satisfies Partial<Dictionary>;

const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };

export type StringKey = keyof typeof en;

/**
 * Returns the string, plus whether a translation was missing. Callers that
 * render user-visible text must handle `missing` — that is what stops a French
 * page quietly filling with English.
 */
export function translate(locale: Locale, key: StringKey): { text: string; missing: boolean } {
  const value = DICTIONARIES[locale][key];
  if (value !== undefined) return { text: value, missing: false };
  return { text: en[key], missing: locale !== 'en' };
}

/** Convenience for strings already known to exist in both dictionaries. */
export function t(locale: Locale, key: StringKey): string {
  return translate(locale, key).text;
}

/** Keys present in English but not in the target locale. Surfaced in CI. */
export function missingKeys(locale: Locale): StringKey[] {
  const target = DICTIONARIES[locale];
  return (Object.keys(en) as StringKey[]).filter((key) => target[key] === undefined);
}
