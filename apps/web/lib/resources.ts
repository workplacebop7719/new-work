import { resource, type Resource, type ResourceInput } from '@northstar/domain';
import type { Locale } from './i18n';

/**
 * Editorial resources — CNT-003, CNT-004.
 *
 * Written in the repository for now and read through an accessor, exactly like
 * the regulatory claims, so the CMS (question Q-13) drops in behind the same
 * two functions without touching a component.
 *
 * ## What these articles are allowed to be
 *
 * PRD §23 asks for editorial that has "original value" rather than
 * mass-produced keyword pages, and §13 warns against exactly that. So each of
 * these is about *our own method* — what we ask for, how to brief work, what to
 * ask a supplier — which is knowledge we actually hold and can be held to.
 *
 * None of them states what the law requires. Where a regulatory statement is
 * genuinely needed, the article carries a `claim` block that renders the
 * versioned claim with its source and review state (ENG-007). If that claim
 * goes on hold, the article shows the hold notice in its place rather than
 * continuing to assert something nobody has re-verified.
 */

/**
 * The source literals use the schema's *input* type, so dates can be written as
 * ISO strings here and arrive as `Date` on the other side of `parse`. Typing
 * these as `Resource` would force `new Date(...)` in every entry — noise in
 * content, and a shape the CMS will not produce either.
 */
type Localized = Record<Locale, ResourceInput>;

const RESOURCES: readonly Localized[] = [
  {
    en: {
      slug: 'evidence-checklist',
      kind: 'checklist',
      title: 'What we ask for, and why we ask for it',
      summary:
        'The documents we request at the start of an engagement, what each one tells us, and what to do when you cannot find one.',
      minutes: 6,
      updatedAt: '2026-08-18',
      accessibilityReviewedBy: null,
      accessibilityReviewedAt: null,
      body: [
        {
          type: 'paragraph',
          text: 'Most engagements slow down in the same place: gathering evidence takes longer than anyone expected. Not because the documents do not exist, but because nobody is sure which version is current or who owns it. This is the list we work from, so you can start before we meet.',
        },
        { type: 'heading', text: 'Policies and public statements' },
        {
          type: 'paragraph',
          text: 'We ask for your accessibility policy, your feedback process, and any statement about accessible formats. What we are looking for is not whether they exist, but whether they describe what your organization actually does. A policy that promises a response time nobody tracks is a finding, and it is a cheap one to fix.',
        },
        { type: 'heading', text: 'Training records' },
        {
          type: 'paragraph',
          text: 'Whatever form they take: a spreadsheet, an export from a learning system, signed attendance sheets. We need to see who was trained, on what, and when. Gaps here are common and are usually about staff turnover rather than neglect.',
        },
        { type: 'heading', text: 'Websites and the systems behind them' },
        {
          type: 'paragraph',
          text: 'A list of your public sites, who manages each one, when it was last redesigned, and whether anyone has looked at accessibility before. Include the systems that generate pages you might not think of as a website — a booking tool, a job board, a parent portal.',
        },
        { type: 'heading', text: 'Documents you send to the public' },
        {
          type: 'paragraph',
          text: 'Handbooks, forms, newsletters, invoices. Pick the five people actually receive most often rather than a complete inventory. Five real documents tell us more than a list of two hundred.',
        },
        { type: 'heading', text: 'When you cannot find something' },
        {
          type: 'paragraph',
          text: 'Say so, and we will record it as missing rather than chase it. Knowing that a record does not exist is itself a finding, and often a more useful one than the record would have been. What does not help anyone is a document produced quickly to fill a gap — we will spot it, and it costs you the trust that makes the rest of the work honest.',
        },
        { type: 'heading', text: 'What we do not ask for' },
        {
          type: 'list',
          items: [
            'Personal information about individual employees, unless a specific requirement makes it necessary.',
            'Disability or accommodation details about named people.',
            'Access to production systems. We work in a test environment.',
            'Anything under legal privilege. If in doubt, ask your counsel first.',
          ],
        },
      ],
    },
    fr: {
      slug: 'liste-de-preuves',
      kind: 'checklist',
      title: 'Ce que nous demandons, et pourquoi',
      summary:
        "Les documents que nous demandons au début d'un mandat, ce que chacun nous apprend, et quoi faire lorsqu'un document est introuvable.",
      minutes: 6,
      updatedAt: '2026-08-18',
      accessibilityReviewedBy: null,
      accessibilityReviewedAt: null,
      body: [
        {
          type: 'paragraph',
          text: "La plupart des mandats ralentissent au même endroit : la collecte des preuves prend plus de temps que prévu. Non pas parce que les documents n'existent pas, mais parce que personne ne sait avec certitude quelle version est à jour ni qui en est responsable. Voici la liste sur laquelle nous travaillons, afin que vous puissiez commencer avant notre rencontre.",
        },
        { type: 'heading', text: 'Politiques et déclarations publiques' },
        {
          type: 'paragraph',
          text: "Nous demandons votre politique d'accessibilité, votre processus de rétroaction et toute déclaration sur les formats accessibles. Ce que nous cherchons n'est pas leur existence, mais si elles décrivent ce que votre organisation fait réellement. Une politique qui promet un délai de réponse que personne ne suit constitue une constatation — et une constatation peu coûteuse à corriger.",
        },
        { type: 'heading', text: 'Dossiers de formation' },
        {
          type: 'paragraph',
          text: "Sous quelque forme que ce soit : un tableur, une exportation d'un système d'apprentissage, des feuilles de présence signées. Nous devons voir qui a été formé, sur quoi et quand. Les lacunes sont fréquentes et tiennent généralement au roulement du personnel plutôt qu'à de la négligence.",
        },
        { type: 'heading', text: 'Sites Web et systèmes sous-jacents' },
        {
          type: 'paragraph',
          text: "Une liste de vos sites publics, la personne qui gère chacun, la date de la dernière refonte et si quelqu'un s'est déjà penché sur l'accessibilité. Incluez les systèmes qui génèrent des pages auxquelles vous ne pensez peut-être pas comme à un site Web : un outil de réservation, un babillard d'emplois, un portail des parents.",
        },
        { type: 'heading', text: 'Documents destinés au public' },
        {
          type: 'paragraph',
          text: "Guides, formulaires, infolettres, factures. Choisissez les cinq que les gens reçoivent le plus souvent plutôt qu'un inventaire complet. Cinq documents réels nous en apprennent davantage qu'une liste de deux cents.",
        },
        { type: 'heading', text: 'Lorsque vous ne trouvez pas un document' },
        {
          type: 'paragraph',
          text: "Dites-le, et nous le noterons comme manquant plutôt que de le réclamer. Savoir qu'un dossier n'existe pas constitue en soi une constatation, souvent plus utile que le dossier lui-même. Ce qui n'aide personne, c'est un document produit à la hâte pour combler un vide : nous le remarquerons, et cela vous coûte la confiance qui rend le reste du travail honnête.",
        },
        { type: 'heading', text: 'Ce que nous ne demandons pas' },
        {
          type: 'list',
          items: [
            "Des renseignements personnels sur des employés, sauf si une exigence précise le rend nécessaire.",
            'Des détails sur le handicap ou les mesures d’adaptation de personnes nommées.',
            "L'accès à vos systèmes de production. Nous travaillons dans un environnement de test.",
            "Tout élément couvert par le secret professionnel. En cas de doute, consultez d'abord votre conseiller juridique.",
          ],
        },
      ],
    },
  },
  {
    en: {
      slug: 'briefing-a-website-audit',
      kind: 'guide',
      title: 'How to brief a website accessibility audit',
      summary:
        'What to decide before you commission an audit, so the findings are usable by the people who have to act on them.',
      minutes: 7,
      updatedAt: '2026-08-18',
      accessibilityReviewedBy: null,
      accessibilityReviewedAt: null,
      body: [
        {
          type: 'paragraph',
          text: 'A bad audit is not usually wrong. It is unusable: hundreds of issues with no severity that anyone trusts, no reproduction steps, and no indication of what to do on Monday. Most of that is decided in the brief, before anyone opens a browser.',
        },
        { type: 'heading', text: 'Decide what is in scope, by page and by journey' },
        {
          type: 'paragraph',
          text: 'A sample of pages is normal and sensible — auditing every page of a large site is rarely worth it. But choose the sample around user journeys rather than around your sitemap. "Find a programme, check eligibility, submit an enquiry" surfaces more than fifteen unrelated pages will.',
        },
        { type: 'heading', text: 'Say who the findings are for' },
        {
          type: 'paragraph',
          text: 'A report written for a developer looks different from one written for an executive, and trying to serve both in one document usually serves neither. Ask for both if you need both, and say so up front — it changes how the work is scoped, not just how it is formatted.',
        },
        { type: 'heading', text: 'Insist on manual testing, and ask what was tested with' },
        {
          type: 'paragraph',
          text: 'Automated tools catch a real but narrow slice of problems. They cannot tell you whether a label is meaningful, whether focus order matches what a sighted user sees, or whether an error message helps. Ask which assistive technologies were used and at what versions. A supplier who cannot answer that has not done the work you are paying for.',
        },
        { type: 'heading', text: 'Ask for reproduction steps on every finding' },
        {
          type: 'paragraph',
          text: 'Browser, assistive technology, the exact page, what was done, what happened, and what should have happened. Without this your developers will spend longer reproducing issues than fixing them, and some findings will quietly be dismissed as unrepeatable.',
        },
        { type: 'heading', text: 'Agree the severity model before the work starts' },
        {
          type: 'paragraph',
          text: 'Severity should describe the impact on a person trying to complete a task, not how hard the fix is. Those two get conflated constantly, and when they do, the expensive-but-critical issues sink down the list. Ask to see the model in writing.',
        },
        { type: 'heading', text: 'Budget for a retest' },
        {
          type: 'paragraph',
          text: 'An audit without a retest tells you what was wrong on one day. Fixes introduce regressions, and some fixes do not do what their author thought. If the budget is tight, audit fewer pages and keep the retest rather than the reverse.',
        },
        { type: 'heading', text: 'A note on standards' },
        {
          type: 'paragraph',
          text: 'Be explicit about which version of WCAG and which conformance level the work is measured against, and make sure that answer is written into the scope rather than assumed. The relevant obligations in your jurisdiction may reference a different version than the one your supplier defaults to.',
        },
        { type: 'claim', claimKey: 'on.reporting.deadline' },
      ],
    },
    fr: {
      slug: 'commander-un-audit-de-site-web',
      kind: 'guide',
      title: "Comment commander un audit d'accessibilité de site Web",
      summary:
        "Ce qu'il faut décider avant de commander un audit, afin que les constatations soient utilisables par ceux qui devront agir.",
      minutes: 7,
      updatedAt: '2026-08-18',
      accessibilityReviewedBy: null,
      accessibilityReviewedAt: null,
      body: [
        {
          type: 'paragraph',
          text: "Un mauvais audit n'est généralement pas erroné : il est inutilisable. Des centaines de problèmes sans gravité crédible, sans étapes de reproduction et sans indication de ce qu'il faut faire lundi matin. Tout cela se décide dans le mandat, avant que quiconque n'ouvre un navigateur.",
        },
        { type: 'heading', text: 'Définissez la portée, par page et par parcours' },
        {
          type: 'paragraph',
          text: "Un échantillon de pages est normal et sensé — auditer chaque page d'un grand site en vaut rarement la peine. Mais choisissez l'échantillon en fonction des parcours utilisateurs plutôt que de votre plan de site. « Trouver un programme, vérifier l'admissibilité, envoyer une demande » révèle plus que quinze pages sans lien entre elles.",
        },
        { type: 'heading', text: 'Précisez à qui les constatations sont destinées' },
        {
          type: 'paragraph',
          text: "Un rapport écrit pour une équipe de développement ne ressemble pas à un rapport écrit pour la direction, et vouloir servir les deux dans un seul document ne sert généralement ni l'un ni l'autre. Demandez les deux si vous en avez besoin, et dites-le d'emblée : cela change la portée du travail, pas seulement sa mise en forme.",
        },
        { type: 'heading', text: "Exigez des tests manuels, et demandez avec quoi" },
        {
          type: 'paragraph',
          text: "Les outils automatisés détectent une part réelle mais étroite des problèmes. Ils ne peuvent pas vous dire si une étiquette a du sens, si l'ordre de focus correspond à ce que voit une personne voyante, ou si un message d'erreur aide. Demandez quelles technologies d'assistance ont été utilisées et dans quelles versions. Un fournisseur incapable de répondre n'a pas fait le travail que vous payez.",
        },
        { type: 'heading', text: 'Exigez des étapes de reproduction pour chaque constatation' },
        {
          type: 'paragraph',
          text: "Navigateur, technologie d'assistance, page exacte, ce qui a été fait, ce qui s'est produit et ce qui aurait dû se produire. Sans cela, votre équipe passera plus de temps à reproduire les problèmes qu'à les corriger, et certaines constatations seront discrètement écartées comme non reproductibles.",
        },
        { type: 'heading', text: 'Convenez du modèle de gravité avant le début des travaux' },
        {
          type: 'paragraph',
          text: "La gravité doit décrire l'incidence sur une personne qui tente d'accomplir une tâche, et non la difficulté de la correction. On confond constamment les deux, et lorsque cela arrive, les problèmes critiques mais coûteux glissent au bas de la liste. Demandez à voir le modèle par écrit.",
        },
        { type: 'heading', text: 'Prévoyez un nouveau test' },
        {
          type: 'paragraph',
          text: "Un audit sans nouveau test vous dit ce qui n'allait pas un jour donné. Les correctifs introduisent des régressions, et certains ne font pas ce que leur auteur croyait. Si le budget est serré, auditez moins de pages et conservez le nouveau test plutôt que l'inverse.",
        },
        { type: 'heading', text: 'Une note sur les normes' },
        {
          type: 'paragraph',
          text: "Soyez explicite sur la version des WCAG et le niveau de conformité visés, et faites inscrire cette réponse dans la portée plutôt que de la présumer. Les obligations applicables dans votre territoire peuvent renvoyer à une version différente de celle que votre fournisseur utilise par défaut.",
        },
        { type: 'claim', claimKey: 'on.reporting.deadline' },
      ],
    },
  },
  {
    en: {
      slug: 'questions-for-a-supplier',
      kind: 'explainer',
      title: 'Seven questions worth asking any accessibility supplier',
      summary:
        'Including the ones we would rather you did not ask us, and what a good answer sounds like.',
      minutes: 5,
      updatedAt: '2026-08-18',
      accessibilityReviewedBy: null,
      accessibilityReviewedAt: null,
      body: [
        {
          type: 'paragraph',
          text: 'We are a supplier in this market, so treat this with the scepticism it deserves. It is still the list we would use if we were buying.',
        },
        { type: 'heading', text: '1. Who will actually do the work?' },
        {
          type: 'paragraph',
          text: 'Not the company — the person. Ask about their credentials and how many audits they have completed. Selling with senior people and delivering with junior ones is the oldest problem in professional services.',
        },
        { type: 'heading', text: '2. What will you not do?' },
        {
          type: 'paragraph',
          text: 'A supplier who cannot name their limits has not thought about them, or is hoping you will not notice until it matters. A good answer is specific and slightly uncomfortable to give.',
        },
        { type: 'heading', text: '3. How much of this is automated?' },
        {
          type: 'paragraph',
          text: 'Automated scanning is a legitimate part of the work and a poor substitute for it. What you want to hear is a clear split: what the tools cover, what a person checks, and roughly what proportion of findings came from each.',
        },
        { type: 'heading', text: '4. Do disabled people test this?' },
        {
          type: 'paragraph',
          text: 'And are they paid properly? Testing with assistive technology is not the same as testing with people who use it daily. Unpaid "community feedback" is a warning sign about how a supplier values the expertise it is selling.',
        },
        { type: 'heading', text: '5. What happens if we disagree with a finding?' },
        {
          type: 'paragraph',
          text: 'There should be a real process — a named reviewer, a way to submit context, and a willingness to withdraw a finding that turns out to be wrong. A supplier who has never withdrawn one either has never been challenged or does not listen.',
        },
        { type: 'heading', text: '6. Will you tell us we are compliant?' },
        {
          type: 'paragraph',
          text: 'The right answer is no, and you should be suspicious of an enthusiastic yes. No supplier can certify your organization, and no report replaces your own responsibility for what you represent. Anyone promising otherwise is selling reassurance rather than work.',
        },
        { type: 'heading', text: '7. What does the deliverable look like?' },
        {
          type: 'paragraph',
          text: 'Ask to see a redacted sample before you commit. Ten minutes with a real report tells you more about a supplier than an hour of conversation — and if the report about accessibility is itself inaccessible, you have your answer.',
        },
      ],
    },
    fr: {
      slug: 'questions-a-poser-a-un-fournisseur',
      kind: 'explainer',
      title: "Sept questions à poser à tout fournisseur en accessibilité",
      summary:
        "Y compris celles que nous préférerions que vous ne nous posiez pas, et à quoi ressemble une bonne réponse.",
      minutes: 5,
      updatedAt: '2026-08-18',
      accessibilityReviewedBy: null,
      accessibilityReviewedAt: null,
      body: [
        {
          type: 'paragraph',
          text: "Nous sommes nous-mêmes un fournisseur de ce marché : accueillez donc ceci avec le scepticisme qui s'impose. Cela reste la liste que nous utiliserions si nous étions acheteurs.",
        },
        { type: 'heading', text: '1. Qui fera réellement le travail ?' },
        {
          type: 'paragraph',
          text: "Pas l'entreprise — la personne. Renseignez-vous sur ses titres et sur le nombre d'audits qu'elle a réalisés. Vendre avec des personnes chevronnées et livrer avec des personnes juniors est le plus vieux problème des services professionnels.",
        },
        { type: 'heading', text: '2. Que ne ferez-vous pas ?' },
        {
          type: 'paragraph',
          text: "Un fournisseur incapable de nommer ses limites n'y a pas réfléchi, ou espère que vous ne le remarquerez pas avant que cela compte. Une bonne réponse est précise et légèrement inconfortable à donner.",
        },
        { type: 'heading', text: '3. Quelle part de ce travail est automatisée ?' },
        {
          type: 'paragraph',
          text: "L'analyse automatisée est une partie légitime du travail et un mauvais substitut à celui-ci. Ce que vous voulez entendre, c'est une répartition claire : ce que couvrent les outils, ce qu'une personne vérifie, et environ quelle proportion des constatations vient de chacun.",
        },
        { type: 'heading', text: '4. Des personnes handicapées testent-elles ceci ?' },
        {
          type: 'paragraph',
          text: "Et sont-elles rémunérées correctement ? Tester avec une technologie d'assistance n'équivaut pas à tester avec des personnes qui l'utilisent quotidiennement. Une « rétroaction communautaire » non rémunérée en dit long sur la valeur qu'un fournisseur accorde à l'expertise qu'il vend.",
        },
        { type: 'heading', text: '5. Que se passe-t-il si nous contestons une constatation ?' },
        {
          type: 'paragraph',
          text: "Il devrait exister un processus réel : un réviseur nommé, un moyen de soumettre du contexte et la volonté de retirer une constatation qui se révèle erronée. Un fournisseur qui n'en a jamais retiré une n'a jamais été contesté ou n'écoute pas.",
        },
        { type: 'heading', text: '6. Nous direz-vous que nous sommes en règle ?' },
        {
          type: 'paragraph',
          text: "La bonne réponse est non, et un oui enthousiaste devrait vous rendre méfiant. Aucun fournisseur ne peut certifier votre organisation, et aucun rapport ne remplace votre propre responsabilité à l'égard de ce que vous déclarez. Quiconque promet le contraire vend de la réassurance plutôt que du travail.",
        },
        { type: 'heading', text: '7. À quoi ressemble le livrable ?' },
        {
          type: 'paragraph',
          text: "Demandez à voir un exemple caviardé avant de vous engager. Dix minutes avec un vrai rapport vous en apprennent plus sur un fournisseur qu'une heure de conversation — et si le rapport sur l'accessibilité est lui-même inaccessible, vous avez votre réponse.",
        },
      ],
    },
  },
];

/** Parsed once at module load, so a malformed resource fails the build. */
const PARSED: readonly Record<Locale, Resource>[] = RESOURCES.map((entry) => ({
  en: resource.parse(entry.en),
  fr: resource.parse(entry.fr),
}));

export function listResources(locale: Locale): readonly Resource[] {
  return PARSED.map((entry) => entry[locale]);
}

export function getResource(locale: Locale, slug: string): Resource | undefined {
  return PARSED.map((entry) => entry[locale]).find((item) => item.slug === slug);
}

/** The matching slug in the other locale, so the language switch never 404s. */
export function translatedSlug(slug: string, from: Locale, to: Locale): string | undefined {
  const entry = PARSED.find((item) => item[from].slug === slug);
  return entry?.[to].slug;
}
