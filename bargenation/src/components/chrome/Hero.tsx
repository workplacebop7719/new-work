import { SearchField } from '@/components/ui/SearchField';

/**
 * HERO (PRD §13, §05).
 *
 * Full-bleed and type-led. The luxury reference for this section is a
 * full-width fashion film; we have no photography and will not invent any
 * for fictional retailers (§45), so the same "edge-to-edge, one dominant
 * gesture, everything else quiet" idea is carried by type instead.
 *
 * One accent only: a short pink rule above the headline. Everything else is
 * black on white with a great deal of air.
 */
export function Hero() {
  return (
    <section className="relative border-b border-line">
      <div className="mx-auto flex min-h-[78vh] max-w-[1600px] flex-col justify-center px-5 py-20 sm:px-8 sm:py-28 lg:min-h-[84vh]">
        <span aria-hidden="true" className="block h-[3px] w-12 bg-pink" />

        <h1 className="display display-hero mt-8 max-w-[13ch] font-normal">
          Before you buy it, check Bargenation.
        </h1>

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-24">
          <p className="max-w-[46ch] text-[1.0625rem] leading-[1.7] text-ink-70">
            We record what things actually cost, month after month, then score today’s price
            against that record — not against the retailer’s claim about it. Sometimes the answer
            is that it isn’t worth buying.
          </p>

          <div>
            <SearchField />
          </div>
        </div>
      </div>
    </section>
  );
}
