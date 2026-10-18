import { Skeleton } from '@/components/ui/skeleton';

function InsightCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 p-5 rounded-lg border border-border bg-card">
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <InsightCardSkeleton />
      <InsightCardSkeleton />
      <InsightCardSkeleton />
      <InsightCardSkeleton />
    </div>
  );
}

function SessionRowSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 px-3.5 py-3 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

export function JournalSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-4 w-40" />
        </div>
      </header>

      <InsightsSkeleton />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <SessionRowSkeleton />
          <SessionRowSkeleton />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <SessionRowSkeleton />
        </div>
      </div>
    </div>
  );
}
