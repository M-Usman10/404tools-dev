import type { Metadata } from "next"

import { UsageContent } from "@/components/dashboard/usage-content"

export const metadata: Metadata = {
  title: "Usage",
  description: "Daily OCR volume and your most recent API requests.",
}

export default function UsagePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Usage</h1>
        <p className="text-muted-foreground mt-1">
          What the OCR API has done for you, day by day and request by request.
        </p>
      </div>

      <UsageContent />
    </div>
  )
}
