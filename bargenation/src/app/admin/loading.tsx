import { PageSkeleton } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8">
      <PageSkeleton />
    </div>
  );
}
