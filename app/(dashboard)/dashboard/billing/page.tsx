import { Suspense } from "react"
import type { Metadata } from "next"

import { BillingContent, BillingSkeleton } from "@/components/dashboard/billing-content"

export const metadata: Metadata = {
  title: "Billing",
  description: "Your page balance, the prepaid packs, and every purchase you have made.",
}

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Prepaid pages, bought a pack at a time. No subscription, and nothing expires.
        </p>
      </div>

      {/* The content reads the purchase=success flag off the URL, and
          useSearchParams opts the whole subtree out of prerendering unless it
          sits behind a boundary. */}
      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>
    </div>
  )
}
