'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SORT_ORDERS, type SortKey } from '@/data/repository-types';

/**
 * How a list of deals is ordered.
 *
 * A real <select> rather than a row of buttons or a custom dropdown: it is
 * keyboard-operable and screen-reader-labelled for free, it uses the native
 * picker on a phone, and it does not need a single line of focus-trapping
 * code to behave correctly.
 *
 * Changing it replaces the URL rather than pushing a new entry. Pressing Back
 * after trying two orders should return you to wherever you came from, not
 * walk you back through your own sorting.
 *
 * Every other parameter in the query string is preserved, so sorting a search
 * result keeps the search.
 */
export function SortControl({ current, count }: { current: SortKey; count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function choose(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set('sort', key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <p className="text-[0.8125rem] text-ink-50 tabular">
        {count} {count === 1 ? 'result' : 'results'}
      </p>
      <div className="flex items-baseline gap-3">
        <label htmlFor="sort" className="eyebrow text-ink-50">Order</label>
        <select
          id="sort"
          name="sort"
          value={current}
          onChange={(event) => choose(event.target.value)}
          className="min-h-[44px] border-b border-ink bg-transparent pb-1 text-[0.875rem] text-ink outline-none focus-visible:border-pink-ink"
        >
          {SORT_ORDERS.map((order) => (
            <option key={order.key} value={order.key}>{order.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
