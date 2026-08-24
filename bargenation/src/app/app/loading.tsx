import { PageSkeleton } from '@/components/ui/Skeleton';

/**
 * The portal is always dynamic — it resolves a session and queries as that
 * customer — so it is the surface most likely to keep somebody waiting.
 */
export default function PortalLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8">
      <PageSkeleton />
    </div>
  );
}
