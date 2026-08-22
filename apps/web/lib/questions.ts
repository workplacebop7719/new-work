/**
 * Qualifier question definitions — PRD §7 ("6–10 questions"), §8 question domains.
 *
 * The questions live beside the UI, and the *rules* live in @northstar/domain.
 * That split is deliberate: wording is content and will change often; routing
 * logic is auditable behaviour and changes under a version bump (CNV-002).
 *
 * Every question is plain language, every option includes an honest "not sure",
 * and no option is preselected (CNV-003 — a preselected answer is a dark pattern
 * when it shapes a recommendation).
 */
import { QUESTION_KEYS, type QuestionKey } from '@northstar/domain';
import type { Locale } from './i18n';

export interface QuestionOption {
  readonly value: string;
  readonly label: Record<Locale, string>;
  readonly description?: Record<Locale, string>;
}

export interface Question {
  readonly key: QuestionKey;
  readonly legend: Record<Locale, string>;
  readonly hint?: Record<Locale, string>;
  readonly multiple?: boolean;
  readonly options: readonly QuestionOption[];
}

const notSure = (en: string, fr: string): QuestionOption => ({
  value: 'unsure',
  label: { en, fr },
});

export const QUESTIONS: readonly Question[] = [
  {
    key: 'ontario_presence',
    legend: { en: 'Does your organization operate in Ontario?', fr: 'Votre organisation exerce-t-elle ses activités en Ontario ?' },
    hint: {
      en: 'We work with organizations operating in Ontario. If yours does not, we will say so rather than take you further.',
      fr: "Nous travaillons avec des organisations actives en Ontario. Si ce n'est pas votre cas, nous vous le dirons plutôt que de poursuivre.",
    },
    options: [
      { value: 'yes', label: { en: 'Yes', fr: 'Oui' } },
      { value: 'no', label: { en: 'No', fr: 'Non' } },
      notSure('I am not sure', "Je ne suis pas certain·e"),
    ],
  },
  {
    key: 'organization_type',
    legend: { en: 'What kind of organization is it?', fr: "De quel type d'organisation s'agit-il ?" },
    options: [
      { value: 'private_school', label: { en: 'Private school or education operator', fr: "École privée ou exploitant en éducation" } },
      { value: 'childcare', label: { en: 'Childcare', fr: "Service de garde" } },
      { value: 'care_provider', label: { en: 'Home care, clinic or care provider', fr: "Soins à domicile, clinique ou prestataire de soins" } },
      { value: 'nonprofit', label: { en: 'Nonprofit', fr: "Organisme sans but lucratif" } },
      { value: 'association', label: { en: 'Association', fr: 'Association' } },
      { value: 'professional_services', label: { en: 'Professional services firm', fr: "Cabinet de services professionnels" } },
      { value: 'other', label: { en: 'Something else', fr: 'Autre chose' } },
    ],
  },
  {
    key: 'employee_band',
    legend: { en: 'How many people does it employ?', fr: "Combien de personnes emploie-t-elle ?" },
    hint: {
      en: 'A range is enough. We do not ask for an exact number because we do not need one.',
      fr: "Une fourchette suffit. Nous ne demandons pas de chiffre exact, car nous n'en avons pas besoin.",
    },
    options: [
      { value: 'under_20', label: { en: 'Fewer than 20', fr: 'Moins de 20' } },
      { value: '20_to_49', label: { en: '20 to 49', fr: '20 à 49' } },
      { value: '50_to_199', label: { en: '50 to 199', fr: '50 à 199' } },
      { value: '200_plus', label: { en: '200 or more', fr: '200 ou plus' } },
    ],
  },
  {
    key: 'reporting_history',
    legend: { en: 'Has your organization filed an accessibility compliance report before?', fr: "Votre organisation a-t-elle déjà déposé un rapport de conformité en matière d'accessibilité ?" },
    options: [
      { value: 'filed_recently', label: { en: 'Yes, recently', fr: 'Oui, récemment' } },
      { value: 'filed_long_ago', label: { en: 'Yes, but a while ago', fr: 'Oui, mais il y a un moment' } },
      { value: 'never_filed', label: { en: 'No, never', fr: 'Non, jamais' } },
      notSure('I am not sure', "Je ne suis pas certain·e"),
    ],
  },
  {
    key: 'public_website',
    legend: { en: 'Do you have a public website?', fr: 'Avez-vous un site Web public ?' },
    options: [
      { value: 'yes_we_own', label: { en: 'Yes, and we manage it ourselves', fr: 'Oui, et nous le gérons nous-mêmes' } },
      { value: 'yes_vendor_managed', label: { en: 'Yes, and a vendor manages it', fr: 'Oui, et un fournisseur le gère' } },
      { value: 'no', label: { en: 'No', fr: 'Non' } },
      notSure('I am not sure', "Je ne suis pas certain·e"),
    ],
  },
  {
    key: 'website_work_done',
    legend: { en: 'Has any accessibility work been done on it?', fr: "Des travaux d'accessibilité y ont-ils été réalisés ?" },
    options: [
      { value: 'audit_done', label: { en: 'We have had an audit', fr: 'Nous avons fait réaliser un audit' } },
      { value: 'some_fixes', label: { en: 'Some fixes, no formal audit', fr: "Quelques correctifs, sans audit formel" } },
      { value: 'nothing_yet', label: { en: 'Nothing yet', fr: 'Rien pour le moment' } },
      notSure('I am not sure', "Je ne suis pas certain·e"),
    ],
  },
  {
    key: 'evidence_availability',
    legend: { en: 'Where are your policies, training records and related documents?', fr: 'Où se trouvent vos politiques, dossiers de formation et documents connexes ?' },
    options: [
      { value: 'organized', label: { en: 'Gathered in one place and up to date', fr: 'Regroupés au même endroit et à jour' } },
      { value: 'scattered', label: { en: 'Spread across people and systems', fr: 'Répartis entre plusieurs personnes et systèmes' } },
      { value: 'unknown', label: { en: 'I do not know what we have', fr: 'Je ne sais pas ce que nous avons' } },
    ],
  },
  {
    key: 'support_needed',
    legend: { en: 'What would be most useful to you right now?', fr: "Qu'est-ce qui vous serait le plus utile en ce moment ?" },
    hint: { en: 'Choose as many as apply.', fr: 'Choisissez autant de réponses que nécessaire.' },
    multiple: true,
    options: [
      { value: 'web_audit', label: { en: 'A website audit', fr: "Un audit de site Web" } },
      { value: 'documents', label: { en: 'Accessible documents', fr: 'Des documents accessibles' } },
      { value: 'policy', label: { en: 'Policy and process help', fr: "De l'aide sur les politiques et processus" } },
      { value: 'training', label: { en: 'Training', fr: 'De la formation' } },
      { value: 'project_management', label: { en: 'Someone to coordinate the work', fr: 'Quelqu’un pour coordonner les travaux' } },
      { value: 'not_sure', label: { en: 'I am not sure yet', fr: "Je ne sais pas encore" } },
    ],
  },
];

/** Guard: the UI must cover exactly the questions the rules engine knows about. */
if (QUESTIONS.length !== QUESTION_KEYS.length) {
  throw new Error('Question definitions and QUESTION_KEYS have diverged.');
}

export function questionAt(step: number): Question | undefined {
  return QUESTIONS[step - 1];
}

export const TOTAL_STEPS = QUESTIONS.length;
