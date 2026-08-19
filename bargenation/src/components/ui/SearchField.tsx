'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * The primary interaction (PRD §13, §14).
 *
 * Set as an editorial field, not a form widget: a single hairline rule, type
 * at reading size, and a plain uppercase submit. The previous version put a
 * saturated pink block on the right, which read as a SaaS signup bar. Pink
 * now appears only as the rule beneath the field once you engage with it —
 * the accent marks attention rather than decorating the control.
 */
const EXAMPLES = ['Kids sneakers', 'Nappies', 'School backpack', 'Winter coat', 'Vacuum'];

export function SearchField({
  autoFocus = false,
  size = 'lg',
}: {
  autoFocus?: boolean;
  size?: 'lg' | 'md';
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [active, setActive] = useState(false);

  const go = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="relative flex items-center gap-4"
      >
        <label htmlFor="site-search" className="sr-only">
          What are you shopping for?
        </label>
        <input
          id="site-search"
          name="q"
          type="search"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          placeholder="What are you shopping for?"
          className={`w-full bg-transparent pb-3 pr-3 text-ink outline-none placeholder:text-ink-50 ${
            size === 'lg'
              ? 'min-h-[52px] text-[1.25rem] sm:text-[1.5rem]'
              : 'min-h-[48px] text-[1.125rem]'
          }`}
        />
        <button
          type="submit"
          className="shrink-0 pb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink transition-opacity duration-[--dur-micro] hover:opacity-55"
        >
          Check
        </button>

        {/* the rule IS the control — pink only once engaged */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-px transition-colors duration-[--dur-component] ${
            active || value ? 'bg-pink-ink' : 'bg-ink'
          }`}
        />
      </form>

      <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {EXAMPLES.map((ex) => (
          <li key={ex}>
            <button
              type="button"
              onClick={() => go(ex)}
              className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-50 transition-colors duration-[--dur-micro] hover:text-ink"
            >
              {ex}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
