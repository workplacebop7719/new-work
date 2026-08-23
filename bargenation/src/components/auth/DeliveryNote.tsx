import type { AuthPort } from '@/auth/types';

/**
 * Says out loud whether a link will actually arrive (PRD §01, §80).
 *
 * The recovery flow is genuinely wired end to end, and against the development
 * adapter it genuinely issues a token — but that token goes to an email port
 * that records messages rather than sending them, so no message reaches an
 * inbox. A form that accepts an address and leaves somebody refreshing their
 * mail for a link that was never sent is exactly the kind of pretend
 * functionality §01 forbids, so the page says so before they type.
 *
 * This disappears entirely once a provider that delivers its own mail is
 * configured, which is what `deliversEmail` on the port reports.
 */
export function DeliveryNote({ port }: { port: AuthPort }) {
  if (!port.configured || port.deliversEmail) return null;

  return (
    <p className="measure mt-6 border-l-2 border-line-strong bg-wash px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-70">
      <strong className="font-medium">Nothing will arrive in your inbox.</strong> Email delivery
      isn’t configured yet, so the link is recorded rather than sent. The form below works and
      issues a real token — it just has nowhere to post it.
    </p>
  );
}
