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
