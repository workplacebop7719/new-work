import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listReviewQueue } from '@/data/admin-repository';
import { NotBuiltYet } from '@/components/ui/NotBuiltYet';

export const metadata: Metadata = { title: 'Needs review' };

export default async function ReviewPage() {
  const session = await readSession();
  if (!session) return null;

  const items = await listReviewQueue(session.user.id);

  return (
    <section>
      <div className="border-b border-line pb-4">
        <h2 className="display display-md">Needs review</h2>
        <p className="measure mt-3 text-[0.9375rem] leading-relaxed text-ink-70">
          Records where two products looked similar enough that choosing between them would have
          been a coin flip. A wrong choice merges two price histories permanently, so the matcher
          asks instead of guessing.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 max-w-[46ch]">
          <p className="display display-lg">Nothing waiting.</p>
          <p className="mt-5 leading-relaxed text-ink-70">
            Every record from the last runs resolved to a single product.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-line border-t border-line">
            {items.map((item) => (
              <li key={item.id} className="py-5">
                <p className="eyebrow text-ink-50">
                  {item.sourceName} ·{' '}
                  {new Date(item.createdAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p className="mt-1.5 text-[1rem]">
                  {typeof item.raw.title === 'string' ? item.raw.title : '(no title)'}
                </p>
                <p className="mt-1 text-[0.8125rem] text-ink-70">{item.reason}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-line pt-8">
            <NotBuiltYet
              label="Resolve match"
              reason="Not built yet. Resolving needs a product picker and a re-ingest of the held record; the queue and its audit trail exist, the editor does not."
            />
          </div>
        </>
      )}
    </section>
  );
}
