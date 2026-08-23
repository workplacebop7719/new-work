import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { changePasswordAction } from '@/auth/actions';
import { MIN_PASSWORD_LENGTH } from '@/auth/types';
import { AuthForm, Field } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Change password' };

/**
 * CHANGE PASSWORD (PRD §37).
 *
 * Asking for the current password is not friction to be smoothed away. It is
 * the only thing standing between a borrowed laptop and a complete account
 * takeover, because changing the password is how an attacker locks the owner
 * out of their own recovery flow.
 */
export default function ChangePasswordPage() {
  return (
    <section className="max-w-[34rem]">
      <nav aria-label="Breadcrumb" className="eyebrow text-ink-50">
        <Link href="/app/account" className="link-grow">Account</Link>
      </nav>
      <h2 className="display display-lg mt-3">Change your password</h2>
      <p className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-70">
        Every other device signed in as you will be signed out. This one stays signed in.
      </p>

      <AuthForm
        action={changePasswordAction}
        submitLabel="Change password"
        configured={auth().configured}
        footer={<p><Link href="/app/account" className="link-grow text-pink-ink">Back to account</Link></p>}
      >
        <Field
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
        />
        <Field
          label="New password"
          name="newPassword"
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
    </section>
  );
}
