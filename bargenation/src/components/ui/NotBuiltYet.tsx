/**
 * PRD §01: never ship a control that looks live and does nothing.
 *
 * Where a capability is on the roadmap but not built, we render the control
 * visibly disabled and state the reason, rather than linking to a 404 or
 * faking the interaction. This component is the single treatment for that,
 * so the honesty reads as deliberate rather than broken.
 */
export function NotBuiltYet({
  label,
  reason,
  className = '',
}: {
  label: string;
  reason: string;
  className?: string;
}) {
  const id = `nb-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <span className={`inline-flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        disabled
        aria-describedby={id}
        className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center border border-line-strong px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-ink-50"
      >
        {label}
      </button>
      <span id={id} className="max-w-[34ch] text-[0.75rem] leading-snug text-ink-50">
        {reason}
      </span>
    </span>
  );
}
