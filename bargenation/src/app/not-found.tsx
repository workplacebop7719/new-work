import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-32 sm:px-8">
      <p className="eyebrow text-ink-50">404</p>
      <h1 className="display display-xl mt-4 max-w-[16ch]">We don’t have a page at that address.</h1>
      <p className="measure mt-6 text-ink-70">
        It may have moved, or it may be something we haven’t built yet.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/today" className="on-pink inline-flex min-h-[44px] items-center px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.04em] hover:bg-ink hover:text-white">
          Today’s deals
        </Link>
        <Link href="/" className="inline-flex min-h-[44px] items-center border border-ink px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.04em]">
          Home
        </Link>
      </div>
    </div>
  );
}
