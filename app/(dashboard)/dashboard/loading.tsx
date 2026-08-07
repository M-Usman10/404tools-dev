import { Skeleton } from "@/components/ui/skeleton"

// The heading is real text rather than a skeleton, so the page has its identity
// before any data arrives. Only the numbers below it are unknown, and each
// placeholder is sized to the content that replaces it so nothing shifts.
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Your page balance, recent API activity, and everything you need to make the first call.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-border bg-card">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-4 h-7 w-16" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Sparkline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mt-4 h-[120px] w-full" />
      </div>

      {/* Get started */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-4 h-[92px] w-full rounded-lg" />
        <Skeleton className="mt-4 h-3 w-56" />
      </div>
    </div>
  )
}
