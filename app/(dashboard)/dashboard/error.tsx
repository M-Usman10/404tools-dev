"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the real error in logs so it can be diagnosed. The digest is the
    // only handle on a production stack trace, so it goes out with it.
    console.error("Dashboard route error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Something went wrong loading this page
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This section failed to load. Try again — your pages, keys and usage history are untouched,
        and the OCR API itself is unaffected.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
    </div>
  )
}
