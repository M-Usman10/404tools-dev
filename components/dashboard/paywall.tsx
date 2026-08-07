"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useUser } from "@/lib/user-context"
import { cn } from "@/lib/utils"
import { PAGE_PACKS, perPageCents, DEFAULT_PAGE_PACK_ID, type PagePackId } from "@/lib/page-packs"

/**
 * What an account that has never bought a pack sees instead of the dashboard.
 * Deliberately a dead end: the only ways out are buying pages or signing out,
 * so there is no route into the product without a purchase.
 *
 * There is nothing useful behind this screen for such an account anyway. An API
 * key it cannot spend and an empty usage chart are not a product, so the first
 * purchase is the real sign-up step and this is where it happens.
 */
export function Paywall() {
  const { signOut } = useUser()
  const [pending, setPending] = useState<PagePackId | null>(null)
  const [error, setError] = useState("")

  const choosePack = async (pack: PagePackId) => {
    setPending(pack)
    setError("")
    try {
      const res = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout")
        setPending(null)
        return
      }
      // The spinner stays up while the browser navigates to Paddle, so clearing
      // pending here would only flash the buttons back to life mid-redirect.
      window.location.href = data.checkoutUrl
    } catch {
      setError("Something went wrong. Please try again.")
      setPending(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-lg leading-none text-primary">[ ]</span>
          <span className="text-lg font-bold tracking-tight text-foreground">404tools.dev</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-12 md:px-8">
        <div className="mb-10 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Buy pages to unlock the OCR API
          </h1>
          {/* One line. The pack cards below carry the pricing and the docs carry
              the detail, so this only has to say what it does and the two facts
              that decide the purchase: no expiry, no subscription. */}
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            PDF or image in, text out. One page charged per page read. No subscription, no expiry.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground/70">
            Captcha solving and proxies coming soon.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PAGE_PACKS.map((pack) => {
            const isPopular = pack.id === DEFAULT_PAGE_PACK_ID
            return (
              <div
                key={pack.id}
                className={cn(
                  "relative flex flex-col rounded-xl border border-border bg-card p-6",
                  isPopular && "border-primary/50"
                )}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                )}

                <h2 className="font-display text-base font-semibold text-foreground">{pack.name}</h2>

                <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-foreground">
                  ${pack.usd}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pack.pages.toLocaleString()} pages
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {perPageCents(pack).toFixed(1)}&cent; per page
                </p>

                <Button
                  className="mt-6 w-full"
                  variant={isPopular ? "default" : "secondary"}
                  onClick={() => void choosePack(pack.id)}
                  disabled={pending !== null}
                >
                  {pending === pack.id ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
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

        {error && <p className="mt-6 text-center text-sm text-destructive">{error}</p>}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {/* Who is actually taking the card. This is the one screen on the site
              that asks for one, so it is where being an unknown name costs the
              most. */}
          One-time purchase, no recurring charge. Payments are handled securely by Paddle.
        </p>
      </main>
    </div>
  )
}
