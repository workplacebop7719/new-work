import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { signOutEverywhereAction } from '@/auth/actions';
import { AuthForm, Field } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign out everywhere' };

/**
 * SIGN OUT EVERYWHERE (PRD §37).
 *
 * There is deliberately no list of devices. Showing one would mean recording
 * where somebody signs in from — an address, a browser, a city — which is
 * precisely what /privacy says we do not collect. A list of your own sessions
 * is a nice feature; it is not worth building the surveillance to render it.
 *
 * So this does the useful half without the collection: end them all, keep
 * this one.
 */
export default function SessionsPage() {
  return (
    <section className="max-w-[34rem]">
      <nav aria-label="Breadcrumb" className="eyebrow text-ink-50">
        <Link href="/app/account" className="link-grow">Account</Link>
      </nav>
      <h2 className="display display-lg mt-3">Sign out everywhere</h2>
      <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
        For the library computer you forgot to close, or a phone you no longer have. Every other
        device signed in as you is signed out. This one stays signed in.
      </p>

      <p className="measure mt-6 border-l-2 border-line-strong bg-wash px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-70">
        <span className="text-ink">There is no list of your devices here, on purpose.</span>{' '}
        Showing one would mean recording where you sign in from — an address, a browser, a city.
        We don’t collect that, so we can’t show it, and we would rather do the useful half than
        start collecting in order to draw a list.
      </p>

      <AuthForm
        action={signOutEverywhereAction}
        submitLabel="Sign out everywhere"
        configured={auth().configured}
        footer={<p><Link href="/app/account" className="link-grow text-pink-ink">Back to account</Link></p>}
      >
        <Field
          label="Your password"
          name="password"
          type="password"
          autoComplete="current-password"
          hint="Asked for so that somebody at your unattended screen can’t do this to you."
        />
      </AuthForm>
    </section>
  );
}
