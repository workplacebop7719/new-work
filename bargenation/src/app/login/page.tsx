import type { Metadata } from 'next';
import { auth } from '@/auth';
import { safeReturnTo } from '@/auth/return-url';
import { signInAction } from '@/auth/actions';
import { AuthForm, Field, AuthLink } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  // Validated here, on the way in, not only on the way out.
  const destination = safeReturnTo(returnTo);
  const configured = auth().configured;

  // Narrow container: a single column at full page width reads as a broken
  // two-column grid rather than as a deliberate one.
  return (
    <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Welcome back</p>
      <h1 className="display display-xl mt-4 max-w-[14ch]">
        Your Watchlist is where you left it.
      </h1>

      <AuthForm
        action={signInAction}
        submitLabel="Sign in"
        configured={configured}
        returnTo={destination}
        footer={
          <p>
            No account yet? <AuthLink href={`/signup?returnTo=${encodeURIComponent(destination)}`}>Create one</AuthLink>.
          </p>
        }
      >
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
      </AuthForm>
    </div>
  );
}

export const dynamic = 'force-dynamic';
