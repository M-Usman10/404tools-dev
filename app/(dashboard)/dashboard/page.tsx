import type { Metadata } from "next"

import { OverviewContent } from "@/components/dashboard/overview-content"

export const metadata: Metadata = {
  title: "Overview",
  description: "Your prepaid page balance, recent OCR activity, and the first API call.",
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Your page balance, recent API activity, and everything you need to make the first call.
        </p>
      </div>

      <OverviewContent />
    </div>
  )
}
