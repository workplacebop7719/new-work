import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/legal/LegalShell';
import { LEGAL_DOCUMENTS } from '@/content/legal';

export const metadata: Metadata = {
  title: 'Disclosures',
  description: 'How Bargenation makes money, and why that cannot change a recommendation.',
};

export default function DisclosuresPage() {
  return (
    <LegalShell document={LEGAL_DOCUMENTS.disclosures!}>
      <h2>How we intend to make money</h2>
      <p>
        When Bargenation is trading, some links out to retailers will earn us a commission if you
        buy. That is the main intended revenue, alongside a paid membership tier and, later,
        aggregate market intelligence sold to retailers.
      </p>
      <p>
        <strong>None of that is live yet.</strong> There are no affiliate agreements, outbound
        links are switched off, and there is nothing to buy. This page describes the arrangement
        we are building toward, so that it is on the record before any money is involved rather
        than after.
      </p>

      <h2>Why commission cannot change a score</h2>
      <p>
        Every shopping site that takes commission says money does not influence its
        recommendations. Here is what that claim is actually worth here.
      </p>
      <p>
        The code that calculates a Value Index has <strong>no parameter through which commission
        could arrive</strong>. It is not that we choose not to pass it — there is nowhere to put
        it. A retailer paying us nothing and a retailer paying us well produce identical output
        from identical evidence, and a test asserts that by scoring the same offer twice with
        commercial data attached and comparing the results.
      </p>
      <p>
        Underneath that, commission lives in a separate area of the database that the scoring
        account has no permission to read. A query reaching for a commission rate does not get a
        wrong answer or a quietly nudged score; it fails outright.
      </p>
      <p>
        The same holds for Deal Signals. The engine that decides whether something deserves to
        interrupt you takes no membership tier, advertiser or commission input, so a paying
        customer’s alert is never prioritised over yours.
      </p>

      <h2>What money will never buy</h2>
      <ul>
        <li>A higher Value Index.</li>
        <li>A Buy recommendation, or the removal of a Hold or Skip.</li>
        <li>Today’s Standout, or a place among the deals that made the cut.</li>
        <li>Undisclosed priority in a list.</li>
        <li>A manufactured deadline, or a claim about stock we cannot see.</li>
      </ul>
      <p>
        If we ever sell a placement, it will be labelled as a placement, and it will not be
        scored as though it earned its position.
      </p>

      <h2>Where prices come from</h2>
      <p>
        We record prices ourselves, over time, and score today against that record. We do not
        repeat a retailer’s claim about what something &ldquo;was&rdquo;, because a claimed
        reference price is marketing rather than evidence.
      </p>
      <p>
        When we have not watched something long enough to judge it, we publish no score and say so.{' '}
        <Link href="/how-it-works" className="link-grow text-pink-ink">
          The arithmetic is published in full
        </Link>
        , including the weight of each component and which ones we could not measure.
      </p>

      <h2>Sample data</h2>
      <p>
        While Bargenation is in development, every retailer and price on the site is fictional and
        labelled as such at the top of every page. No invented price is ever attached to a real
        company.
      </p>
    </LegalShell>
  );
}
