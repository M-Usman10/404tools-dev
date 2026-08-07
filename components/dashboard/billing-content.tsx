"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import { Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUser } from "@/lib/user-context"
import { cn } from "@/lib/utils"
import {
  DEFAULT_PAGE_PACK_ID,
  PAGE_PACKS,
  findPagePack,
  perPageCents,
  type PagePackId,
} from "@/lib/page-packs"

interface Purchase {
  id: string
  pack_id: string
  pages: number
  amount_cents: number | null
  currency: string | null
  paddle_transaction_id: string
  created_at: string
}

interface BillingResponse {
  profile: {
    pages_balance: number
    pages_used_total: number
    created_at: string | null
  } | null
  purchases: Purchase[]
}

async function fetcher(url: string): Promise<BillingResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Request failed")
  return res.json() as Promise<BillingResponse>
}

const purchaseDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

function formatAmount(cents: number | null, currency: string | null): string {
  if (cents === null) return "—"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
    }).format(cents / 100)
  } catch {
    // An unexpected currency code from Paddle should cost a symbol, not the
    // whole receipt row.
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim()
  }
}

export function BillingContent() {
  const { profile } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState<PagePackId | null>(null)

  // Both the webhook (crediting pages) and the OCR route (spending them) move
  // this underneath the page, so unlike most of the dashboard it revalidates on
  // focus: coming back to the tab after a purchase should show the new balance.
  const { data, mutate } = useSWR<BillingResponse>("/api/billing/status", fetcher)

  // A route can re-render for many reasons and the toast must not follow along,
  // so the celebration is fired exactly once per mount.
  const celebrated = useRef(false)
  useEffect(() => {
    if (celebrated.current) return
    if (searchParams.get("purchase") !== "success") return

    celebrated.current = true
    toast.success("Payment received", {
      description: "Your pages are on the way. The balance updates as soon as Paddle confirms.",
      duration: 6000,
    })
    // The webhook usually lands before the browser gets back here, but not
    // always, so ask the server again rather than trusting the render we have.
    void mutate()
    router.replace("/dashboard/billing")
    router.refresh()
  }, [searchParams, mutate, router])

  const pagesBalance = data?.profile?.pages_balance ?? profile?.pages_balance ?? 0
  const pagesUsed = data?.profile?.pages_used_total ?? profile?.pages_used_total ?? 0
  const purchases = data?.purchases
  const totalPurchased = purchases?.reduce((sum, row) => sum + row.pages, 0) ?? null

  const buy = async (pack: PagePackId) => {
    setPending(pack)
    try {
      const res = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      })
      const body = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string }
      if (res.ok && body.checkoutUrl) {
        // The spinner stays up while the browser navigates to checkout, so
        // clearing it here would only flash the buttons back mid-redirect.
        window.location.href = body.checkoutUrl
        return
      }
      toast.error(body.error ?? "Couldn't open checkout. Please try again.")
      setPending(null)
    } catch {
      toast.error("Couldn't open checkout. Please try again.")
      setPending(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 sm:col-span-2">
          <p className="text-sm font-medium text-muted-foreground">Pages remaining</p>
          <p
            className={cn(
              "mt-2 font-mono text-4xl font-bold tabular-nums",
              pagesBalance === 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {pagesBalance.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {pagesBalance === 0
              ? "You're out of pages. The OCR API returns 402 until you buy another pack."
              : "Prepaid and non-expiring. One page is charged per page the API reads."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Pages used all-time</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {pagesUsed.toLocaleString()}
          </p>
          {totalPurchased === null ? (
            <Skeleton className="mt-2 h-3 w-32" />
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              of {totalPurchased.toLocaleString()} purchased
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Buy more pages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time purchases, never a subscription. Bigger packs cost less per page and the pages
          stack on top of whatever you have left.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PAGE_PACKS.map((pack) => {
            const isPopular = pack.id === DEFAULT_PAGE_PACK_ID
            return (
              <div
                key={pack.id}
                className={cn(
                  "relative flex flex-col rounded-xl border border-border bg-card p-5",
                  isPopular && "border-primary/50"
                )}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                )}

                <p className="font-display text-base font-semibold text-foreground">{pack.name}</p>
                <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-foreground">
                  ${pack.usd}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pack.pages.toLocaleString()} pages
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {perPageCents(pack).toFixed(1)}&cent; per page
                </p>

                <Button
                  className="mt-5 w-full"
                  variant={isPopular ? "default" : "secondary"}
                  onClick={() => void buy(pack.id)}
                  disabled={pending !== null}
                >
                  {pending === pack.id ? (
                    <>
                      <Spinner />
                      Redirecting...
                    </>
                  ) : (
                    "Buy pages"
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Purchase history</h2>
        <div className="mt-4 rounded-xl border border-border bg-card">
          {purchases === undefined ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <Skeleton className="h-4 w-28 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16 shrink-0" />
                  <Skeleton className="h-4 w-14 shrink-0" />
                </div>
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Receipt className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No purchases yet. Buying a pack above adds it here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead>Pack</TableHead>
                    <TableHead className="text-right">Pages</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((row) => {
                    // A pack that has since been renamed or dropped from the
                    // catalog still has to render its receipt, so the stored id
                    // is the fallback rather than an error.
                    const pack = findPagePack(row.pack_id)
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                          {purchaseDate(row.created_at)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{pack?.name ?? row.pack_id}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {row.paddle_transaction_id}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                          +{row.pages.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                          {formatAmount(row.amount_cents, row.currency)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Receipts and invoices are emailed by Paddle, our merchant of record.
        </p>
      </div>
    </div>
  )
}

// Shared by billing/loading.tsx and by the Suspense boundary the page wraps
// this component in, so the two cannot drift apart and swap into each other
// cleanly.
export function BillingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 sm:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-10 w-40" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Buy more pages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time purchases, never a subscription. Bigger packs cost less per page and the pages
          stack on top of whatever you have left.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PAGE_PACKS.map((pack) => (
            <div key={pack.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-1.5 h-3 w-20" />
              <Skeleton className="mt-5 h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Purchase history</h2>
        <div className="mt-4 rounded-xl border border-border bg-card divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16 shrink-0" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
