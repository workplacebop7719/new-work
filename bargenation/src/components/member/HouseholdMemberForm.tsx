import type { HouseholdMemberRow } from '@/data/member-repository';

/**
 * One person in a household (PRD §35).
 *
 * Uncontrolled inputs with `defaultValue`, deliberately. React resets
 * uncontrolled fields after a form action returns — which here is the correct
 * behaviour, because the action revalidates and the server sends back the
 * saved values. The bug that pattern causes elsewhere (a validation failure
 * wiping what somebody typed) cannot happen here: nothing about this form can
 * fail validation. An unparseable birth year is stored as "not given" rather
 * than rejected, because arguing with somebody about a child's details is a
 * poor trade for a field that is optional anyway.
 */
export function HouseholdMemberForm({
  member,
  action,
  removeAction,
  submitLabel,
  maxLength,
}: {
  member?: HouseholdMemberRow;
  action: (formData: FormData) => Promise<void>;
  removeAction?: (formData: FormData) => Promise<void>;
  submitLabel: string;
  maxLength: number;
}) {
  const id = member?.id ?? 'new';
  const field =
    'mt-2 min-h-[44px] w-full border-b border-ink bg-transparent pb-1.5 text-[1rem] text-ink outline-none focus-visible:border-pink-ink';

  return (
    <div>
      {member && (
        <p className="display display-sm">
          {member.nickname ?? <span className="text-ink-50">No name given</span>}
        </p>
      )}

      <form action={action} className="mt-4 grid gap-6 sm:grid-cols-2">
        {member && <input type="hidden" name="memberId" value={member.id} />}

        <div>
          <label htmlFor={`nickname-${id}`} className="eyebrow block text-ink-50">
            What they’re called
          </label>
          <input
            id={`nickname-${id}`}
            name="nickname"
            type="text"
            maxLength={maxLength}
            defaultValue={member?.nickname ?? ''}
            aria-describedby={`nickname-hint-${id}`}
            className={field}
          />
          <p id={`nickname-hint-${id}`} className="mt-2 text-[0.75rem] leading-snug text-ink-50">
            A nickname, not a full name. Optional.
          </p>
        </div>

        <div>
          <label htmlFor={`birthYear-${id}`} className="eyebrow block text-ink-50">
            Birth year
          </label>
          <input
            id={`birthYear-${id}`}
            name="birthYear"
            type="text"
            inputMode="numeric"
            maxLength={4}
            defaultValue={member?.birthYear ?? ''}
            aria-describedby={`birthYear-hint-${id}`}
            className={field}
          />
          <p id={`birthYear-hint-${id}`} className="mt-2 text-[0.75rem] leading-snug text-ink-50">
            The year only. There is nowhere here for a full date of birth.
          </p>
        </div>

        <div>
          <label htmlFor={`clothingSize-${id}`} className="eyebrow block text-ink-50">
            Clothing size
          </label>
          <input
            id={`clothingSize-${id}`}
            name="clothingSize"
            type="text"
            maxLength={maxLength}
            defaultValue={member?.clothingSize ?? ''}
            className={field}
          />
        </div>

        <div>
          <label htmlFor={`shoeSize-${id}`} className="eyebrow block text-ink-50">
            Shoe size
          </label>
          <input
            id={`shoeSize-${id}`}
            name="shoeSize"
            type="text"
            maxLength={maxLength}
            defaultValue={member?.shoeSize ?? ''}
            className={field}
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center border border-ink px-5 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors duration-[--dur-micro] hover:bg-ink hover:text-white"
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {member && removeAction && (
        <form action={removeAction} className="mt-4">
          <input type="hidden" name="memberId" value={member.id} />
          <button
            type="submit"
            className="min-h-[44px] text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-70 hover:text-ink"
          >
            Remove from household
          </button>
          <p className="mt-1 max-w-[46ch] text-[0.75rem] leading-snug text-ink-50">
            Anything you were watching for them stays on your Watchlist — it just stops being
            for anybody in particular.
          </p>
        </form>
      )}
    </div>
  );
}
