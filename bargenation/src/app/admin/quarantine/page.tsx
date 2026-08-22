import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listQuarantine, readRole } from '@/data/admin-repository';
import { canReleaseQuarantine } from '@/auth/roles';
import { QuarantineCard } from '@/components/admin/QuarantineCard';

export const metadata: Metadata = { title: 'Quarantine' };

export default async function QuarantinePage() {
  const session = await readSession();
  if (!session) return null;

  const [held, role] = await Promise.all([
    listQuarantine(session.user.id),
    readRole(session.user.id),
  ]);

  return (
    <section>
      <div className="border-b border-line pb-4">
        <h2 className="display display-md">Held for confirmation</h2>
        <p className="measure mt-3 text-[0.9375rem] leading-relaxed text-ink-70">
          Prices too extraordinary to record on one sighting. They are outside the permanent
          history until somebody decides. A genuine crash and a broken feed look identical in a
          single row, which is why they wait here.
        </p>
      </div>

      {held.length === 0 ? (
        <div className="mt-12 max-w-[46ch]">
          <p className="display display-lg">Nothing is being held.</p>
          <p className="mt-5 leading-relaxed text-ink-70">
            Either the feeds have been unremarkable, or corroboration arrived on its own and
            released them.
          </p>
        </div>
      ) : (
        <ul className="mt-8">
          {held.map((h) => (
            <QuarantineCard key={h.id} held={h} canRelease={canReleaseQuarantine(role)} />
          ))}
        </ul>
      )}
    </section>
  );
}
