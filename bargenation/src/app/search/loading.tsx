import { DealGridSkeleton } from '@/components/ui/Skeleton';

/**
 * Search is the page somebody waits on most, because they typed something and
 * are watching for it. Without this the whole page blanks between keystroke
 * and result, which reads as the site having lost the query.
 */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <div className="h-[3rem] w-full max-w-[36rem] bg-wash" aria-hidden="true" />
      <DealGridSkeleton count={6} />
    </div>
  );
}
