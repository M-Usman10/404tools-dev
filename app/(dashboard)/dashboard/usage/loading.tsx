import { UsageSkeleton } from "@/components/dashboard/usage-content"

// Heading and subtitle are the real strings, so the route is recognisable the
// instant it is entered. The skeleton underneath is the same one the client
// component falls back to on its own first fetch, which is what makes the
// handover from route transition to data fetch invisible.
export default function UsageLoading() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Usage</h1>
        <p className="text-muted-foreground mt-1">
          What the OCR API has done for you, day by day and request by request.
        </p>
      </div>

      <UsageSkeleton />
    </div>
  )
}
