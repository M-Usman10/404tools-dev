import { BillingSkeleton } from "@/components/dashboard/billing-content"

// Heading, subtitle and the two section headings are the real strings — none of
// them depend on data, so making them wait for it would only make the route
// feel slower than it is.
export default function BillingLoading() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Prepaid pages, bought a pack at a time. No subscription, and nothing expires.
        </p>
      </div>

      <BillingSkeleton />
    </div>
  )
}
