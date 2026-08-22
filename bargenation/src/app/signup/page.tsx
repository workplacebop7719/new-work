import type { Metadata } from 'next';
import { auth } from '@/auth';
import { safeReturnTo } from '@/auth/return-url';
import { signUpAction } from '@/auth/actions';
import { MIN_PASSWORD_LENGTH } from '@/auth/types';
import { AuthForm, Field, AuthLink } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const destination = safeReturnTo(returnTo);
  const configured = auth().configured;

  // Narrow container: a single column at full page width reads as a broken
  // two-column grid rather than as a deliberate one.
  return (
    <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Create account</p>
      <h1 className="display display-xl mt-4 max-w-[14ch]">Start watching what matters.</h1>
      <p className="measure-tight mt-6 text-[1rem] leading-relaxed text-ink-70">
        Three fields. We’ll ask about sizes and favourite retailers later, and only because it
        makes the recommendations better.
      </p>

      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        configured={configured}
        returnTo={destination}
        footer={
          <p>
            Already have one? <AuthLink href={`/login?returnTo=${encodeURIComponent(destination)}`}>Sign in</AuthLink>.
            {' '}Marketing email is a separate choice you make later — creating an account doesn’t
            subscribe you to anything.
          </p>
        }
      >
        <Field label="Name" name="displayName" autoComplete="given-name" required={false}
               hint="What we’ll call you. A first name or a nickname is fine." />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password"
               hint={`At least ${MIN_PASSWORD_LENGTH} characters. Longer beats complicated.`} />
      </AuthForm>
    </div>
  );
}

export const dynamic = 'force-dynamic';
