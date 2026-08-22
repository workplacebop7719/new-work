import type { Metadata } from 'next';
import { readSession } from '@/auth/session';
import { listReviewQueue } from '@/data/admin-repository';
import { ReviewCard } from '@/components/admin/ReviewCard';

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
        <ul className="mt-8">
          {items.map((item) => <ReviewCard key={item.id} item={item} />)}
        </ul>
      )}
    </section>
  );
}
