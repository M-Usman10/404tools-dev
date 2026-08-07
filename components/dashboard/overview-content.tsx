"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Bar, BarChart, XAxis } from "recharts"
import { Activity, Check, Copy, FileText, Gauge, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useUser } from "@/lib/user-context"
import { cn } from "@/lib/utils"

// The origin the curl example points at. Read from the same env var the server
// builds absolute URLs from so a self-hosted deploy shows its own hostname
// rather than ours, and inlined at build time so the server and client render
// the identical string.
const API_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://404tools.dev").replace(/\/+$/, "")

const CURL_EXAMPLE = `curl -X POST ${API_ORIGIN}/api/v1/ocr \\
  -H "Authorization: Bearer $OCR_API_KEY" \\
  -F "file=@invoice.pdf"`

interface DailyBucket {
  date: string
  requests: number
  pages: number
}

interface UsageResponse {
  daily: DailyBucket[]
  totals: { requests: number; pages: number; failed: number }
}

interface KeysResponse {
  keys: { id: string }[]
}

interface BillingResponse {
  profile: { pages_balance: number; pages_used_total: number } | null
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Request failed")
  return res.json() as Promise<T>
}

const chartConfig = {
  pages: { label: "Pages", color: "var(--primary)" },
} satisfies ChartConfig

const shortDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

export function OverviewContent() {
  const { profile } = useUser()

  // The balance moves without the page moving: the Paddle webhook credits it
  // out of band and every API call debits it. The server-rendered profile is
  // the first paint, this keeps it honest afterwards.
  const { data: billing } = useSWR<BillingResponse>("/api/billing/status", fetcher)
  const { data: usage } = useSWR<UsageResponse>("/api/usage?days=30", fetcher, {
    revalidateOnFocus: false,
  })
  const { data: keyList } = useSWR<KeysResponse>("/api/keys", fetcher, {
    revalidateOnFocus: false,
  })

  const pagesBalance = billing?.profile?.pages_balance ?? profile?.pages_balance ?? 0
  const pagesUsed = billing?.profile?.pages_used_total ?? profile?.pages_used_total ?? 0
  const requests = usage?.totals.requests ?? 0
  const failed = usage?.totals.failed ?? 0
  const daily = usage?.daily ?? []
  // Undefined while the list is in flight, which is a different thing from a
  // user who has genuinely never made a key — only the latter should be pushed
  // towards creating one.
  const keyCount = keyList ? keyList.keys.length : undefined
  const hasKeys = keyCount === undefined || keyCount > 0
  const hasChartData = daily.some((bucket) => bucket.pages > 0)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={FileText}
          value={pagesBalance.toLocaleString()}
          label="Pages remaining"
          hint={
            pagesBalance === 0
              ? "Out of pages — the API returns 402"
              : "prepaid, and they never expire"
          }
          alert={pagesBalance === 0}
        />
        <StatTile
          icon={Gauge}
          value={pagesUsed.toLocaleString()}
          label="Pages used all-time"
          hint={pagesUsed === 0 ? "nothing spent yet" : "one page charged per page read"}
        />
        <StatTile
          icon={Activity}
          value={usage ? requests.toLocaleString() : undefined}
          label="Requests, last 30 days"
          hint={
            !usage
              ? undefined
              : failed > 0
                ? `${failed.toLocaleString()} failed`
                : requests > 0
                  ? "all succeeded"
                  : "no calls in the window"
          }
          alert={failed > 0}
        />
        <StatTile
          icon={KeyRound}
          value={keyCount === undefined ? undefined : keyCount.toLocaleString()}
          label="Active API keys"
          hint={
            keyCount === undefined
              ? undefined
              : keyCount === 0
                ? "create one to call the API"
                : "revoke any you no longer use"
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Pages consumed</p>
            <p className="text-xs text-muted-foreground">daily · last 30 days</p>
          </div>
          <Link
            href="/dashboard/usage"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Full usage
          </Link>
        </div>

        <div className="mt-4">
          {!usage ? (
            <Skeleton className="h-[120px] w-full" />
          ) : hasChartData ? (
            <ChartContainer config={chartConfig} className="aspect-auto h-[120px] w-full">
              <BarChart data={daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={28}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent labelFormatter={(value) => shortDate(String(value))} />}
                />
                {/* Animation off so the bars still paint in a background tab,
                    where requestAnimationFrame is throttled to a standstill. */}
                <Bar dataKey="pages" fill="var(--color-pages)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-border/70">
              <p className="text-xs text-muted-foreground">
                Nothing yet. Your first API call shows up here within a minute.
              </p>
            </div>
          )}
        </div>
      </div>

      <GetStarted hasKeys={hasKeys} />
    </div>
  )
}

function StatTile({
  icon: Icon,
  value,
  label,
  hint,
  alert = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  // Undefined means the number is still loading, which shows a skeleton in the
  // exact slot the digits land in rather than a zero that later jumps.
  value: string | undefined
  label: string
  hint: string | undefined
  alert?: boolean
}) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {value === undefined ? (
        <Skeleton className="mt-4 h-7 w-16" />
      ) : (
        <p className="mt-4 font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
      )}
      <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
      {hint === undefined ? (
        <Skeleton className="mt-1.5 h-3 w-32" />
      ) : (
        <p className={cn("mt-0.5 text-xs", alert ? "font-medium text-destructive" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  )
}

function GetStarted({ hasKeys }: { hasKeys: boolean }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CURL_EXAMPLE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied outright, and there is nothing to
      // recover: the snippet is on screen and selectable either way.
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">Get started</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasKeys
          ? "Post a PDF or an image and get the text back, page by page. Swap in one of your keys and run this."
          : "The OCR API only answers to a Bearer key, so that is the first stop."}
      </p>

      {!hasKeys && (
        <Button asChild className="mt-4">
          <Link href="/dashboard/api-keys">
            <KeyRound />
            Create an API key
          </Link>
        </Button>
      )}

      <div className="relative mt-4">
        <pre
          className={cn(
            "overflow-x-auto rounded-lg border border-border/70 bg-background p-4 pr-12 font-mono text-xs leading-relaxed text-foreground",
            // Dimmed rather than hidden for a keyless account: seeing the shape
            // of the call is the argument for making a key in the first place.
            !hasKeys && "opacity-60"
          )}
        >
          {CURL_EXAMPLE}
        </pre>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-2"
          onClick={() => void copy()}
          aria-label="Copy the example request"
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span>
          Also accepts a raw body or <code className="font-mono text-foreground">{`{"url": "..."}`}</code>
        </span>
        <Link href="/dashboard/docs" className="font-medium text-primary underline-offset-4 hover:underline">
          Read the docs
        </Link>
      </div>
    </div>
  )
}
