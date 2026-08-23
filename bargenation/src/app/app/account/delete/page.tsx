import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { deleteAccountAction } from '@/auth/actions';
import { DELETE_CONFIRMATION } from '@/auth/types';
import { AuthForm, Field } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Delete account' };

/**
 * DELETE ACCOUNT (PRD §37, §70).
 *
 * The page's job is to make sure nobody arrives here by accident and nobody
 * leaves it surprised. So it lists what goes, what does not go, and why —
 * before the form, not after it.
 *
 * The two exceptions are real and neither is a shortcut. A newsletter
 * subscription was a separate act of consent with its own evidentiary record,
 * and silently revoking it would be as wrong as silently keeping it. And with
 * a hosted auth provider we can erase everything we hold but not the login
 * identity itself, because that needs a key which bypasses row level security
 * and is deliberately absent from this process — so the page says which of
 * the two happened rather than implying more than was done.
 */
export default function DeleteAccountPage() {
  const port = auth();

  return (
    <section className="max-w-[34rem]">
      <nav aria-label="Breadcrumb" className="eyebrow text-ink-50">
        <Link href="/app/account" className="link-grow">Account</Link>
      </nav>
      <h2 className="display display-lg mt-3">Delete your account</h2>
      <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
        This cannot be undone, and we do not keep a copy to restore from.{' '}
        <Link href="/app/account/export" className="link-grow text-pink-ink">
          Export your data
        </Link>{' '}
        first if you want to keep any of it.
      </p>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="eyebrow text-ink-50">What goes</h3>
        <ul className="mt-4 space-y-2 text-[0.875rem] leading-relaxed text-ink">
          <li>Your profile and display name</li>
          <li>Your household and everyone in it</li>
          <li>Your Watchlist and everything on it</li>
          <li>Your Saved items</li>
          <li>Every Deal Signal we have sent you</li>
        </ul>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="eyebrow text-ink-50">What does not</h3>
        <ul className="mt-4 space-y-3 text-[0.875rem] leading-relaxed text-ink-70">
          <li>
            <span className="text-ink">A subscription to The Edit.</span> Subscribing was a
            separate decision with its own consent record, so deleting this account does not
            quietly cancel it.{' '}
            <Link href="/edit/manage" className="link-grow text-pink-ink">
              Unsubscribe here
            </Link>{' '}
            if you want that gone too.
          </li>
          <li>
            <span className="text-ink">Our record of what things cost.</span> Price history is not
            about you — it is the same for every customer, and it is what the whole product rests
            on.
          </li>
          {!port.canDeleteIdentity && (
            <li>
              <span className="text-ink">The sign-in itself.</span> We erase everything we hold,
              but removing the login from our authentication provider needs a key that bypasses
              every access control in the database, and this application deliberately does not
              have one. Email us and a person will finish it.
            </li>
          )}
        </ul>
      </div>

      <AuthForm
        action={deleteAccountAction}
        submitLabel="Delete my account"
        configured={port.configured}
        footer={<p><Link href="/app/account" className="link-grow text-pink-ink">Keep my account</Link></p>}
      >
        <Field
          label="Your password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        <Field
          label={`Type ${DELETE_CONFIRMATION} to confirm`}
          name="confirmation"
          type="text"
          autoComplete="off"
          hint="A password stops somebody else doing this. Typing the word stops you doing it by accident."
        />
      </AuthForm>
    </section>
  );
}
