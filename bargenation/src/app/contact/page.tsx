import type { Metadata } from 'next';
import Link from 'next/link';
import { requiredDetails } from '@/content/legal';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach Bargenation, and what is not reachable yet.',
};

/**
 * PRD §01. A contact form that silently discards messages is worse than no
 * form, so there is no form here until there is somewhere for a message to go.
 */
export default function ContactPage() {
  const privacyEmail = requiredDetails().find((d) => d.key === 'privacyEmail')?.value ?? null;
  const supportEmail = requiredDetails().find((d) => d.key === 'supportEmail')?.value ?? null;
  const anyAddress = privacyEmail ?? supportEmail;

  return (
    <div className="mx-auto max-w-[44rem] px-5 pb-28 pt-14 sm:px-8">
      <h1 className="display display-hero max-w-[12ch]">Get in touch</h1>

      {anyAddress ? (
        <dl className="mt-12 border-t border-ink">
          {supportEmail && (
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line py-5">
              <dt className="text-[0.9375rem] text-ink-50">A problem with a price or a deal</dt>
              <dd>
                <a href={`mailto:${supportEmail}`} className="link-grow text-pink-ink">
                  {supportEmail}
                </a>
              </dd>
            </div>
          )}
          {privacyEmail && (
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line py-5">
              <dt className="text-[0.9375rem] text-ink-50">Your data</dt>
              <dd>
                <a href={`mailto:${privacyEmail}`} className="link-grow text-pink-ink">
                  {privacyEmail}
                </a>
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <div className="mt-12 max-w-[48ch]">
          <p className="display display-md">There is no way to reach us yet.</p>
          <p className="mt-6 leading-relaxed text-ink-70">
            Bargenation is still being built and has no monitored inbox. We would rather say that
            than put a contact form here that quietly discards what you write, or an address that
            nobody reads.
          </p>
          <p className="mt-4 leading-relaxed text-ink-70">
            When there is somewhere for a message to go, it will be on this page.
          </p>
        </div>
      )}

      <p className="mt-14 border-t border-line pt-8 text-[0.875rem] leading-relaxed text-ink-70">
        In the meantime,{' '}
        <Link href="/how-it-works" className="link-grow text-pink-ink">how a score is calculated</Link>{' '}
        and{' '}
        <Link href="/disclosures" className="link-grow text-pink-ink">how we intend to make money</Link>{' '}
        are both written down in full.
      </p>
    </div>
  );
}
