"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { initializePaddle } from "@paddle/paddle-js"
import { Button } from "@/components/ui/button"
import { findPagePack } from "@/lib/page-packs"

export function CheckoutClient() {
  // Anything that stops the overlay from opening ends here. Without it the page
  // sits on "Loading checkout..." forever — an ad blocker or a corporate proxy
  // blocking cdn.paddle.com is the common case — and the user has just been told
  // a payment is in progress, which is the worst moment for a dead end.
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!clientToken) {
      setFailed(true)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const transactionId = params.get("_ptxn")
    if (!transactionId) {
      setFailed(true)
      return
    }

    // The pack comes from the checkout link rather than the charged total:
    // tax-inclusive pricing and coupons both move the total off list price, so
    // the total is not a reliable way to tell which pack was bought.
    const pack = findPagePack(params.get("pack"))

    const environment =
      process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox"

    initializePaddle({
      environment,
      token: clientToken,
      checkout: {
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
        },
      },
      eventCallback(event) {
        if (event.name === "checkout.completed") {
          // The pages themselves are credited by the webhook, which may not have
          // landed yet. This flag only exists so /thank-you can tell a real
          // completion from someone typing the URL, and so it knows how many
          // pages to promise.
          if (pack) sessionStorage.setItem("pages_purchased", pack.id)
          window.location.href = "/thank-you"
        }
        if (event.name === "checkout.closed") {
          window.location.href = "/dashboard/billing"
        }
      },
    })
      .then((paddle) => {
        if (!paddle) {
          setFailed(true)
          return
        }
        // Only the transaction id: opening a checkout for an existing transaction
        // takes customer and items from that transaction and ignores anything
        // passed here. The email is prefilled by attaching the customer when the
        // transaction is created (see /api/paddle/checkout).
        paddle.Checkout.open({ transactionId })
      })
      .catch((error) => {
        console.error("[checkout] Paddle failed to initialise:", error)
        setFailed(true)
      })
  }, [])

  if (failed) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Checkout could not open
          </h1>
          <p className="text-sm text-muted-foreground">
            Nothing has been charged. An ad blocker or a network that blocks Paddle will do
            this; try again from billing, or with blocking paused.
          </p>
          <Button asChild>
            <Link href="/dashboard/billing">Back to billing</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Loading checkout...</p>
    </div>
  )
}
