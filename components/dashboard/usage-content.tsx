"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BarChart3, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface DailyBucket {
  date: string
  requests: number
  pages: number
}

interface RecentRow {
  id: string
  createdAt: string
  pages: number
  status: string
  model: string | null
  fileName: string | null
  fileBytes: number | null
  durationMs: number | null
  error: string | null
  keyName: string | null
  keyPrefix: string | null
}

interface UsageResponse {
  days: number
  daily: DailyBucket[]
  recent: RecentRow[]
  totals: { requests: number; pages: number; failed: number }
}

async function fetcher(url: string): Promise<UsageResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Request failed")
  return res.json() as Promise<UsageResponse>
}

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

const chartConfig = {
  pages: { label: "Pages", color: "var(--primary)" },
  requests: { label: "Requests", color: "var(--muted-foreground)" },
} satisfies ChartConfig

// The API buckets days in UTC, so these format in UTC too. Reading them back in
// the viewer's zone would shift every label by a day for anyone west of London.
const shortDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

const fullDate = (key: string) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })

// Individual requests are timestamps rather than buckets, so these render in
// local time — someone matching a row against their own logs is looking at a
// clock, not a report.
const rowTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function UsageContent() {
  const [range, setRange] = useState<Range>(30)
  // keepPreviousData holds the old chart in place while a new range loads, so
  // switching the window never collapses the page to a skeleton and back.
  const { data, isLoading } = useSWR<UsageResponse>(`/api/usage?days=${range}`, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  const daily = data?.daily ?? []
  const recent = data?.recent ?? []
  const totals = data?.totals
  const hasChartData = daily.some((bucket) => bucket.requests > 0)
  const hasAnyUsage = hasChartData || recent.length > 0

  // Only the very first load has nothing to show. After that the previous
  // range's data stays on screen, so the skeleton would be a step backwards.
  if (isLoading && !data) {
    return <UsageSkeleton />
  }

  if (!hasAnyUsage) {
    return (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>No usage yet</EmptyTitle>
          <EmptyDescription>
            Every call to the OCR API lands here within a minute — pages charged, how long Azure
            took, and what came back.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard/docs">Make your first request</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Total label="Requests" value={totals?.requests ?? 0} />
            <Total label="Pages charged" value={totals?.pages ?? 0} />
            <Total label="Failed" value={totals?.failed ?? 0} alert={(totals?.failed ?? 0) > 0} />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background p-1">
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-mono text-xs tabular-nums transition-colors",
                  range === option
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {hasChartData ? (
            <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
              <BarChart data={daily} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={28}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent labelFormatter={(value) => fullDate(String(value))} />}
                />
                {/* Animation off so the bars still paint in a background tab,
                    where requestAnimationFrame is throttled to a standstill. */}
                <Bar dataKey="pages" fill="var(--color-pages)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar
                  dataKey="requests"
                  fill="var(--color-requests)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border/70">
              <p className="text-sm text-muted-foreground">
                No requests in the last {range} days.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Recent requests</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            the 50 newest calls, regardless of the window above
          </p>
        </div>

        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No requests recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[168px]">Time</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => {
                  const failed = row.status !== "succeeded"
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                        {rowTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="truncate text-sm text-foreground">
                          {row.fileName ?? "(unnamed upload)"}
                        </p>
                        {row.keyName && (
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {row.keyName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                        {row.pages.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            failed ? "text-destructive" : "text-primary"
                          )}
                          // The failure reason is the only thing anyone wants
                          // when a row is red, and it is far too long to sit in
                          // a column, so the cell carries it as a title.
                          title={row.error ?? undefined}
                        >
                          {failed ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {failed ? "Failed" : "Succeeded"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {formatDuration(row.durationMs)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function Total({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div>
      <p
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          alert ? "text-destructive" : "text-foreground"
        )}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// Shared by this component's first load and by usage/loading.tsx, so the two
// cannot drift apart and swap into each other cleanly.
export function UsageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-7 w-16" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="mt-6 h-[240px] w-full" />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-32 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-10 shrink-0" />
              <Skeleton className="h-4 w-20 shrink-0" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
