import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-100",
        className
      )}
    />
  );
}

export function KPISkeletons() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-5 shadow-sm">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="border border-gray-100 rounded-xl p-5 shadow-sm">
      <Skeleton className="h-4 w-40 mb-6" />
      <div className="flex items-end gap-3 h-48">
        {[60, 80, 50, 90, 70, 85, 65].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md animate-pulse bg-gray-100" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterpretationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="border border-gray-100 rounded-xl p-5 shadow-sm space-y-2">
        <Skeleton className="h-4 w-24 mb-3" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
