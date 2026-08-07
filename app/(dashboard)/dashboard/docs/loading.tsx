import { Skeleton } from "@/components/ui/skeleton"

// Without a boundary of its own this route inherits the Overview skeleton from
// the parent segment, so entering the docs briefly paints the wrong page title
// and four stat tiles before swapping them for prose. Heading and subtitle are
// the real strings; only the reference sections below them are placeholders.
export default function DocsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          OCR API docs
        </h1>
        <p className="mt-1 text-muted-foreground">
          Everything the endpoint accepts and returns.
        </p>
      </div>

      <div className="space-y-6">
        {[0, 1, 2].map((section) => (
          <div key={section} className="space-y-3 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
