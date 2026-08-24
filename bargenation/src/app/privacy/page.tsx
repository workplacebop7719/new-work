import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/LegalShell';
import { LEGAL_DOCUMENTS } from '@/content/legal';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Bargenation collects, what it deliberately does not, and what you can ask us to do.',
};

/**
 * Written against the actual schema rather than from a template.
 *
 * Every claim below corresponds to a column that exists or deliberately does
 * not exist — see db/migrations/0003_accounts.sql and 0005_commerce_isolation.
 * A privacy policy that does not match the database is worse than none,
 * because it is a promise nobody is keeping.
 */
export default function PrivacyPage() {
  return (
    <LegalShell document={LEGAL_DOCUMENTS.privacy!}>
      <h2>The short version</h2>
      <p>
        We record what things cost. That is the product, and it involves no personal data at all —
        a price history belongs to a product, not to a person. Everything we hold about{' '}
        <strong>you</strong> exists because you asked for something: an account, a Watchlist, an
        email.
      </p>

      <h2>What we hold if you have an account</h2>
      <ul>
        <li>Your email address, and a display name if you give one. A nickname is fine.</li>
        <li>What you have saved, and what you have asked us to watch — including a target price, a size or a colour if you set one.</li>
        <li>The Deal Signals we have sent you, and whether you opened them.</li>
        <li>Your preferences: categories, retailers, how often you want to hear from us.</li>
      </ul>

      <h2>What we hold about your household, if you choose to tell us</h2>
      <p>
        Household details are optional and exist for one reason: a coat in the wrong size is not a
        bargain. You can add a nickname, a birth year, a clothing size and a shoe size.
      </p>
      <p>
        <strong>Read the absences here as deliberate.</strong> There is nowhere in our database to
        put a child’s legal name, date of birth, school, home address, medical information or any
        government identifier. Not "we choose not to collect it" — the columns do not exist. We
        cannot lose, be compelled to hand over, or mis-sell a field we never created.
      </p>
      <p>
        A birth year rather than a date of birth is enough to judge whether something suits a
        seven-year-old, and it is meaningfully less identifying.
      </p>

      <h2>What we hold if you only take the newsletter</h2>
      <p>
        An email address, whether you confirmed it, where you signed up, and a dated record of that
        consent. An account is not required to receive The Bargenation Edit.
      </p>
      <p>
        The consent record exists so that if you ever ask "when did I agree to this?", we can
        answer precisely rather than plausibly. It cannot be edited or deleted, including by us.
      </p>

      <h2>What we record when you go to a retailer</h2>
      <p>
        If you follow a link out to a retailer, we record that a click happened, which link, and
        roughly what kind of browser it came from. If you were signed in, we record that it was
        you.
      </p>
      <p>
        We do not record your IP address, and we do not fingerprint your device. Those columns are
        absent from the click table for the same reason as the household ones.
      </p>

      <h2>The one place your connection is counted</h2>
      <p>
        To stop somebody trying thousands of passwords, or burying a real person under password
        reset emails, we have to be able to tell that a run of attempts came from the same place.
      </p>
      <p>
        <strong>We still do not store your IP address to do it.</strong> It is put through a keyed
        one-way function first, and only the result is written down — a fixed-length value that
        cannot be turned back into an address without a secret that never leaves our servers.
        Every one of those rows is deleted within a day, and they are attached to nothing else
        about you: not your account, not your Watchlist, not what you looked at.
      </p>
      <p>
        The same is true of the email address on a password-reset form. What is counted is a
        derived value, not the address.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell personal information, and we do not sell anything about a household or a child.</li>
        <li>We do not load third-party scripts, so no advertising network is watching you here.</li>
        <li>We do not use your data to decide what something is worth. Scoring reads recorded prices; it has no access to who you are.</li>
      </ul>
      <p>
        The aggregate intelligence we may one day sell to retailers is exactly that — aggregate. It
        would describe demand for a category, never a person, a household or a child.
      </p>

      <h2>Who can see your data inside Bargenation</h2>
      <p>
        Access is enforced by the database, not by our own good intentions. Every query about your
        account runs as you, under rules PostgreSQL applies rather than rules our code remembers to
        apply. A bug in our software returns nothing rather than somebody else’s Watchlist.
      </p>
      <p>
        Staff working the ingestion queue connect with an account that has <strong>no permission
        at all</strong> to read households, saved items, Watchlists, Deal Signals, preferences or
        subscribers. Fixing a mismatched product does not require reading anybody’s family, so that
        access was never granted.
      </p>

      <h2>Asking to see, correct or delete your data</h2>
      <p>
        You can do all three yourself, from your account. Export downloads a file of everything
        your account holds. Delete removes it. Your household, your Watchlist and what we noticed
        are editable wherever they appear.
      </p>
      <p>
        Two honest caveats. First, recorded prices are not deleted, because they are not about
        you — deleting your account removes your account, not the record that a coat cost forty
        dollars in March. Second, if our authentication provider is one that only its own staff
        can remove an account from, we erase everything we hold and tell you plainly that the
        sign-in itself needs a person to finish; the delete page says which of the two happened.
      </p>

      <h2>Children</h2>
      <p>
        Bargenation is for adults doing the shopping. We do not knowingly create accounts for
        children, and the household feature describes a child without identifying one.
      </p>

      <h2>Changes</h2>
      <p>
        If this changes in a way that matters, we will say so rather than quietly reissuing the
        page with a new date.
      </p>
    </LegalShell>
  );
}
