import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { auth } from '@/auth';
import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export const metadata: Metadata = { title: 'Account' };

/**
 * PRD §37. Everything listed there that is not built is stated as such rather
 * than rendered as a control that does nothing (§01).
 */
export default async function AccountPage() {
  const session = await readSession();
  if (!session) return null; // the layout has already redirected

  const { user } = session;
  const provider = auth().name;

  return (
    <div className="max-w-[46rem] space-y-14">
      <section>
        <h2 className="display display-md border-b border-line pb-4">Profile</h2>
        <dl className="mt-6 space-y-4 text-[0.9375rem]">
          <div className="flex justify-between gap-6 border-b border-line pb-4">
            <dt className="text-ink-50">Name</dt>
            <dd>{user.displayName ?? 'Not set'}</dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-line pb-4">
            <dt className="text-ink-50">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-ink-50">Email confirmed</dt>
            <dd>{user.emailVerified ? 'Yes' : 'Not yet'}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">Security</h2>
        <div className="mt-6 flex flex-wrap gap-8">
          <NotBuiltYet
            label="Change password"
            reason="Not built yet. The auth port supports it; the page isn’t written."
          />
          <NotBuiltYet
            label="Sign out everywhere"
            reason="Not built yet. Needs session listing the provider doesn’t expose to us."
          />
        </div>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">Privacy</h2>
        <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
          We hold your email, an optional display name, and whatever you choose to add about your
          household — a nickname, a birth year, sizes. We never asked for a child’s legal name,
          date of birth, school or address, and there is nowhere in the database to put them.
        </p>
        <div className="mt-6 flex flex-wrap gap-8">
          <NotBuiltYet
            label="Delete account"
            reason="Not built yet. This must delete the household record too, so it needs writing carefully rather than quickly."
          />
          <NotBuiltYet
            label="Export my data"
            reason="Not built yet."
          />
        </div>
      </section>

      <section>
        <h2 className="display display-md border-b border-line pb-4">Membership</h2>
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
          You’re on the free tier. There is no paid tier yet — when there is, the free product
          stays genuinely useful.
        </p>
      </section>

      <p className="border-t border-line pt-6 text-[0.75rem] text-ink-50">
        Auth provider in this environment: {provider}.
      </p>
    </div>
  );
}
