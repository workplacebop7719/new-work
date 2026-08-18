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
