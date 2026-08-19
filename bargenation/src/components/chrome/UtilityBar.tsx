import { dataMode } from '@/data/repository';

/**
 * Top utility bar (PRD §45 disclosure, §05 reference register).
 *
 * The luxury-house pattern this is drawn from: a thin band above the header,
 * small uppercase type at wide letterspacing, centred, carrying one message
 * and nothing else. Ours carries the sample-data disclosure — a bar that
 * exists for honesty rather than promotion, but the same quiet furniture.
 *
 * Not dismissible: if the product is running on fixtures it says so, always.
 */
export function UtilityBar() {
  if (dataMode === 'LIVE') return null;
  return (
    <div className="bg-ink text-white">
      <p className="mx-auto flex min-h-[34px] max-w-[1600px] items-center justify-center gap-2.5 px-5 py-2 text-center text-[0.625rem] font-medium uppercase leading-[1.5] tracking-[0.14em]">
        <span className="hidden sm:inline">Sample data</span>
        <span aria-hidden="true" className="hidden sm:inline opacity-40">—</span>
        <span className="opacity-80">
          Every retailer and price here is fictional. No real retailer is named.
        </span>
      </p>
    </div>
  );
}
