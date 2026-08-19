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
