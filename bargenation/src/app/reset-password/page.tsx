import type { Metadata } from 'next';
import { auth } from '@/auth';
import { resetPasswordAction } from '@/auth/actions';
import { isPlausibleToken } from '@/auth/token';
import { MIN_PASSWORD_LENGTH } from '@/auth/types';
import { AuthForm, Field, AuthLink } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

/**
 * RESET PASSWORD (PRD §28, §31).
 *
 * The token arrives in the query string and is carried through the form in a
 * hidden field. It is shape-checked here so a mangled or missing link produces
 * a page that explains itself, rather than a form that collects a new password
 * and only then admits it cannot use it.
 *
 * The token is never rendered as text, only as a form value — it should not be
 * in anything a customer might copy out of the page, screenshot or paste into
 * a support conversation.
 *
 * Success does not sign anybody in; see resetPasswordAction for why.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const port = auth();

  if (!isPlausibleToken(token)) {
    return (
      <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
        <p className="eyebrow text-ink-50">Account recovery</p>
        <h1 className="display display-xl mt-4 max-w-[16ch]">That link isn’t complete.</h1>
        <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
          Password reset links carry a token, and this one arrived without a usable one — mail
          clients sometimes truncate long links, and a link that has already been used stops
          working on purpose.
        </p>
        <p className="mt-8">
          <AuthLink href="/forgot-password">Request a new link</AuthLink>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[38rem] px-5 pb-28 pt-16 sm:px-8">
      <p className="eyebrow text-ink-50">Account recovery</p>
      <h1 className="display display-xl mt-4 max-w-[16ch]">Choose a new password.</h1>
      <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
        Setting this password signs out every device that was signed in as you, including this
        one. That is deliberate — if somebody else had your old password, they lose access here.
      </p>

      <AuthForm
        action={resetPasswordAction}
        submitLabel="Set new password"
        configured={port.configured}
        hidden={{ token }}
        footer={
          <p>
            Changed your mind? <AuthLink href="/login">Sign in</AuthLink> with your old password —
            it still works until you set a new one.
          </p>
        }
      >
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. Longer is better than complicated.`}
        />
        <Field
          label="Type it again"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
        />
      </AuthForm>
    </div>
  );
}

export const dynamic = 'force-dynamic';
