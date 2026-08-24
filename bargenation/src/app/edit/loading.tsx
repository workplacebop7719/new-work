import { PageSkeleton } from '@/components/ui/Skeleton';

export default function EditLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-12 sm:px-8">
      <PageSkeleton />
    </div>
  );
}
