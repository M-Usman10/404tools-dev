import type { Metadata } from "next"

import { OcrApiReference } from "@/components/docs/ocr-api-reference"
import { getSiteUrl } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "Docs",
  description: "How to call the 404tools OCR API: authentication, requests, responses and errors.",
}

export default function DocsPage() {
  // The examples are prefilled with the origin this deployment actually answers
  // on, so copying one out of a preview or a local run calls that environment
  // rather than silently pointing at production.
  const origin = getSiteUrl()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          OCR API docs
        </h1>
        <p className="mt-1 text-muted-foreground">
          Everything the endpoint accepts and returns. The examples below are already pointed at{" "}
          <span className="font-mono text-sm text-foreground">{origin}</span>.
        </p>
      </div>

      <OcrApiReference origin={origin} layout="compact" keysHref="/dashboard/api-keys" />
    </div>
  )
}
