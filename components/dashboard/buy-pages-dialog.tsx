"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { PAGE_PACKS, type PagePackId } from "@/lib/page-packs"

// Pack picker for one-time page purchases. Selecting a pack creates the Paddle
// transaction and hands the browser to the overlay checkout page.
export function BuyPagesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [buyingPack, setBuyingPack] = useState<PagePackId | null>(null)

  const checkout = async (pack: PagePackId) => {
    setBuyingPack(pack)
    try {
      const res = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      })
      const data = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string }
      if (res.ok && data.checkoutUrl) {
        // Keep the spinner while the browser navigates to checkout.
        window.location.href = data.checkoutUrl
        return
      }
      toast.error(data.error ?? "Couldn't open checkout. Please try again.")
      setBuyingPack(null)
    } catch {
      toast.error("Couldn't open checkout. Please try again.")
      setBuyingPack(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Locked shut mid-checkout. Closing the dialog would strand a Paddle
        // transaction that has already been created and is about to be paid.
        if (buyingPack === null) onOpenChange(next)
      }}
    >
      {/* Portalled to the body, outside the .app-shell wrapper the dashboard
          layout paints the palette on, so the class is repeated here. */}
      <DialogContent className="app-shell sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Buy pages</DialogTitle>
          <DialogDescription>
            One page is charged per page read by the OCR API. Purchased pages never expire.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {PAGE_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => void checkout(pack.id)}
              disabled={buyingPack !== null}
              className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="flex items-center gap-2.5">
                {buyingPack === pack.id ? (
                  <Spinner className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-primary/70" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {pack.pages.toLocaleString()} pages
                </span>
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                ${pack.usd}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
