import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse rounded-md bg-muted/65 dark:bg-muted/40 ${className}`} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="border border-border bg-card text-card-foreground shadow-sm rounded-lg p-6 flex flex-col gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2 mt-1" />
      <Skeleton className="h-3 w-2/3 mt-2" />
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Table Header skeleton */}
      <div className="flex gap-4 p-4 border-b border-border">
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-28" />
      </div>
      {/* Table Rows skeleton */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 items-center border-b border-border/40">
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="w-24">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="w-20">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="w-28 flex justify-end">
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
