/**
 * Placeholder shapes shown while a page is fetching.
 *
 * Deliberately no shimmer or pulse animation. A moving skeleton reads as
 * "something is happening to this content"; a still one reads as "this is not
 * here yet", which is the truth. It also keeps the page quiet, which is the
 * register the rest of the product is written in.
 *
 * The shapes match the real layout's rhythm so the page does not visibly jump
 * when the content arrives.
 */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`h-[1em] bg-wash ${className}`} />;
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-wash ${className}`} />;
}

/**
 * A grid of deal-card placeholders.
 *
 * `aria-busy` on a labelled region, rather than a visually hidden "Loading…"
 * paragraph: a screen reader announces the state of the region it is in,
 * without a phantom paragraph appearing and vanishing from the page.
 */
export function DealGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading deals"
      className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col">
          <SkeletonBlock className="aspect-[4/5] w-full" />
          <SkeletonLine className="mt-4 w-1/3" />
          <SkeletonLine className="mt-3 h-[1.6em] w-4/5" />
          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <SkeletonLine className="h-[1.75em] w-24" />
            <SkeletonLine className="h-[1.5em] w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A page heading plus a paragraph or two, for text-led routes. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-4">
      <SkeletonLine className="h-[2.5em] w-2/3 max-w-[24rem]" />
      <SkeletonLine className="w-full max-w-[36rem]" />
      <SkeletonLine className="w-5/6 max-w-[32rem]" />
      <SkeletonLine className="w-2/3 max-w-[26rem]" />
    </div>
  );
}
