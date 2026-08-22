import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell, Detail } from '@/components/legal/LegalShell';
import { LEGAL_DOCUMENTS, detail } from '@/content/legal';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'What Bargenation promises, what it does not, and how either side ends this.',
};

export default function TermsPage() {
  return (
    <LegalShell document={LEGAL_DOCUMENTS.terms!}>
      <h2>What this is</h2>
      <p>
        Bargenation records retail prices over time and tells you whether today’s price is worth
        it. Using the site means accepting what follows.
      </p>

      <h2>What we promise</h2>
      <ul>
        <li>Scores are arithmetic, from prices we recorded ourselves. The method is published.</li>
        <li>Where we cannot measure enough to judge something, we say so rather than guess.</li>
        <li>Commission never changes a score or a recommendation. See <Link href="/disclosures" className="link-grow text-pink-ink">Disclosures</Link>.</li>
        <li>We will not invent a price, a discount, a deadline or a stock level.</li>
      </ul>

      <h2>What we do not promise</h2>
      <p>
        We are not the retailer. We do not set prices, hold stock, take payment, ship anything or
        handle returns. A price we recorded an hour ago may have changed, and a retailer may
        decline your order for reasons we cannot see.
      </p>
      <p>
        A Value Index is our reading of the evidence we have, not a guarantee that something is a
        good buy for you. <strong>You are making the purchase decision.</strong> We are trying to
        make it a better-informed one.
      </p>
      <p>
        Where a score rests on thin evidence we say so on the page. Please take that seriously
        rather than reading past it.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your password to yourself; you are responsible for what happens under your account.</li>
        <li>Do not scrape the site, resell our data, or attempt to reach another customer’s account.</li>
        <li>Household details you add are yours to change or remove at any time.</li>
      </ul>

      <h2>Membership</h2>
      <p>
        There is no paid tier yet. When there is, you will be able to cancel it from your account
        settings, and cancelling will take effect at the end of the period you have already paid
        for. We are stating that here so it is a commitment rather than a decision made later.
      </p>

      <h2>Ending this</h2>
      <p>
        You can stop using Bargenation whenever you like and ask us to delete your account. We may
        suspend an account that is being used to attack the service or to harm other customers,
        and we will say why.
      </p>

      <h2>Liability</h2>
      <p>
        Bargenation is provided as it is. To the extent the law allows, we are not liable for
        losses arising from a purchase you made, a price that changed, or a score that turned out
        to be a poor guide. Nothing here removes rights you have as a consumer that cannot be
        removed by agreement.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the law of{' '}
        <Detail value={detail('jurisdiction')} describes="governing province or state" />, and the
        agreement is with{' '}
        <Detail value={detail('entity')} describes="operating company" />.
      </p>
      <p>
        Those two facts are genuinely unsettled rather than omitted, which is why they appear as
        gaps rather than as a plausible-looking name. Everything above stands regardless of how
        they are filled in.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change materially we will say so on the site rather than reissuing the page
        quietly with a new date.
      </p>
    </LegalShell>
  );
}
