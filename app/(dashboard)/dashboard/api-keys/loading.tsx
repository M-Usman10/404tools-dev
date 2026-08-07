import { Skeleton } from "@/components/ui/skeleton"

export default function ApiKeysLoading() {
  return (
    <div className="space-y-8">
      {/* The heading is real rather than skeletoned: it is known before the
          query runs, and painting it immediately makes the route feel like it
          arrived rather than like it is still deciding what it is. */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          API Keys
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every OCR request is authenticated with one of these. Keys are shown in full exactly
          once, when you create them.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-5 w-40 shrink-0" />
              <Skeleton className="h-4 w-36 shrink-0" />
              <div className="flex-1" />
              <Skeleton className="hidden h-4 w-24 shrink-0 sm:block" />
              <Skeleton className="hidden h-4 w-24 shrink-0 md:block" />
              <Skeleton className="h-4 w-12 shrink-0" />
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
