import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { readHousehold, memberFeaturesAvailable, MAX_HOUSEHOLD_FIELD } from '@/data/member-repository';
import {
  addHouseholdMemberAction, updateHouseholdMemberAction, removeHouseholdMemberAction,
} from '@/data/member-actions';
import { HouseholdMemberForm } from '@/components/member/HouseholdMemberForm';
import { EmptyState } from '@/components/member/EmptyState';

export const metadata: Metadata = { title: 'Household' };

/**
 * WHO YOU ARE SHOPPING FOR (PRD §35, §37).
 *
 * The reason this exists: a coat in the wrong size is not a bargain, however
 * good the Value Index. This is what turns "60% off" into "60% off, and it is
 * the size your eldest actually wears".
 *
 * The page leads with the absences rather than burying them in /privacy,
 * because this is the one screen where somebody is being asked about a child.
 * They should be able to see, before typing anything, that there is nowhere
 * here to put a legal name, a date of birth, a school or an address — not as
 * a policy we chose, but as columns that do not exist.
 *
 * Every field is optional, including the nickname. Somebody who only knows a
 * shoe size should be able to record that and nothing else; requiring a name
 * to store a size would ask for more about a child than the feature needs.
 */
export default async function HouseholdPage() {
  const session = await readSession();
  if (!session || !memberFeaturesAvailable) return null;

  const household = await readHousehold(session.user.id);
  const members = household?.members ?? [];

  return (
    <section className="max-w-[46rem]">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
        <h2 className="display display-md">Household</h2>
        <p className="text-[0.8125rem] text-ink-50">
          {members.length === 0
            ? 'Nobody added'
            : `${members.length} ${members.length === 1 ? 'person' : 'people'}`}
        </p>
      </div>

      <p className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-70">
        A coat in the wrong size is not a bargain. Tell us who you shop for and we can say
        whether a deal is the right size, not just a good price. All of this is optional and
        none of it is required to use anything else.
      </p>

      <div className="mt-8 border-l-2 border-ink bg-wash px-4 py-4">
        <h3 className="eyebrow text-ink-50">What there is nowhere to put</h3>
        <p className="measure mt-3 text-[0.875rem] leading-relaxed text-ink-70">
          No legal name, no date of birth, no school, no address, no medical information, no
          government identifier. <span className="text-ink">Not “we choose not to ask”</span> — the
          columns do not exist in our database. We cannot lose, be compelled to hand over, or
          mis-sell a field we never created.
        </p>
        <p className="measure mt-3 text-[0.875rem] leading-relaxed text-ink-70">
          A nickname is enough to size a coat and a birth year is enough to judge whether a toy
          suits. Please use a nickname rather than a full name — we have no need for one.
        </p>
      </div>

      {members.length === 0 ? (
        <EmptyState
          title="Nobody here yet."
          body="Add whoever you shop for. A first name they’re called at home and a size is plenty."
          action={{ href: '#add', label: 'Add someone' }}
        />
      ) : (
        <ul className="mt-12 space-y-10 border-t border-line pt-10">
          {members.map((person) => (
            <li key={person.id}>
              <HouseholdMemberForm
                member={person}
                action={updateHouseholdMemberAction}
                removeAction={removeHouseholdMemberAction}
                submitLabel="Save changes"
                maxLength={MAX_HOUSEHOLD_FIELD}
              />
            </li>
          ))}
        </ul>
      )}

      <div id="add" className="mt-14 border-t border-ink pt-8">
        <h3 className="display display-sm">Add someone</h3>
        <HouseholdMemberForm
          action={addHouseholdMemberAction}
          submitLabel="Add to household"
          maxLength={MAX_HOUSEHOLD_FIELD}
        />
      </div>
    </section>
  );
}
