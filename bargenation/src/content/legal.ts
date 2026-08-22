/**
 * Legal document metadata and the details we do not yet have (PRD §70).
 *
 * TWO RULES GOVERN THIS FILE.
 *
 * 1. Never invent a legal detail. The operating entity, its address, its
 *    contact addresses and the governing jurisdiction are facts about a
 *    company, not copy. A plausible-looking placeholder is worse than a
 *    visible gap, because it stops looking like a gap.
 *
 * 2. Never claim compliance. These are drafts describing what the software
 *    actually does. Whether that satisfies CCPA, PIPEDA, Law 25, COPPA or
 *    CASL is a lawyer's judgement, and saying otherwise would be the product
 *    asserting something nobody has checked.
 *
 * HOW THE GAPS ARE PRESENTED
 *
 * An earlier product in this lineage scattered amber "[entity name — to be
 * completed]" markers through the prose, and they read as broken template
 * output. Here the prose never contains a gap: it says "Bargenation", which is
 * true. Every missing fact is listed ONCE, deliberately, in a panel that looks
 * like a considered statement rather than a rendering failure.
 */

export interface RequiredDetail {
  key: string;
  label: string;
  /** What it is for, so a reader understands why its absence matters. */
  purpose: string;
  envVar: string;
  value: string | null;
}

const read = (name: string): string | null => {
  const raw = process.env[name];
  return raw && raw.trim() !== '' ? raw.trim() : null;
};

/**
 * Read at module scope from NEXT_PUBLIC_ vars so the values are available in
 * both server and client rendering, and so a deployment can supply them
 * without a code change.
 */
export function requiredDetails(): RequiredDetail[] {
  return [
    {
      key: 'entity',
      label: 'Operating company',
      purpose: 'Who these terms are an agreement with, and who is accountable for your data.',
      envVar: 'NEXT_PUBLIC_LEGAL_ENTITY',
      value: read('NEXT_PUBLIC_LEGAL_ENTITY'),
    },
    {
      key: 'address',
      label: 'Registered address',
      purpose: 'Where formal notice can be served, and required on commercial email.',
      envVar: 'NEXT_PUBLIC_LEGAL_ADDRESS',
      value: read('NEXT_PUBLIC_LEGAL_ADDRESS'),
    },
    {
      key: 'privacyEmail',
      label: 'Privacy contact',
      purpose: 'Where to send a request to see, correct or delete your data.',
      envVar: 'NEXT_PUBLIC_PRIVACY_EMAIL',
      value: read('NEXT_PUBLIC_PRIVACY_EMAIL'),
    },
    {
      key: 'supportEmail',
      label: 'Support contact',
      purpose: 'Where to report a problem with a price, a deal or an account.',
      envVar: 'NEXT_PUBLIC_SUPPORT_EMAIL',
      value: read('NEXT_PUBLIC_SUPPORT_EMAIL'),
    },
    {
      key: 'jurisdiction',
      label: 'Governing jurisdiction',
      purpose: 'Which province or state’s law applies to these terms.',
      envVar: 'NEXT_PUBLIC_GOVERNING_JURISDICTION',
      value: read('NEXT_PUBLIC_GOVERNING_JURISDICTION'),
    },
  ];
}

export function detail(key: string): string | null {
  return requiredDetails().find((d) => d.key === key)?.value ?? null;
}

export function missingDetails(): RequiredDetail[] {
  return requiredDetails().filter((d) => d.value === null);
}

/**
 * Whether a document has been through legal review.
 *
 * Hard-coded to false and intended to STAY false until a lawyer has actually
 * read it. It is not derived from an environment variable, because "reviewed"
 * must not be something a deployment can assert about itself.
 */
export const LAWYER_REVIEWED = false;

export interface LegalDocument {
  slug: string;
  title: string;
  /** What this document is for, in one line. */
  summary: string;
  /** ISO date the current draft was written. */
  drafted: string;
}

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy',
    summary: 'What we collect, what we deliberately do not, and what you can ask us to do.',
    drafted: '2026-08-22',
  },
  terms: {
    slug: 'terms',
    title: 'Terms',
    summary: 'What Bargenation promises, what it does not, and how either side ends this.',
    drafted: '2026-08-22',
  },
  disclosures: {
    slug: 'disclosures',
    title: 'Disclosures',
    summary: 'How Bargenation makes money, and why that cannot change a recommendation.',
    drafted: '2026-08-22',
  },
};
