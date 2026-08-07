"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, CheckCircle2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { findPagePack, type PagePack } from "@/lib/page-packs"

export default function ThankYouPage() {
  const router = useRouter()
  // Holds the purchased pack once confirmed. The checkout writes the pack id
  // right before redirecting here, so an empty slot means nobody came through
  // a completed checkout.
  const [pack, setPack] = useState<PagePack | null>(null)
  // Tracked separately from pack, because a flag that no longer resolves to a
  // pack (renamed or retired between the checkout opening and this redirect)
  // still means a real payment just happened. Conflating the two rendered a
  // blank page to a customer who had just been charged, and the flag is already
  // consumed by then so a reload could not recover either.
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const flag = sessionStorage.getItem("pages_purchased")
    if (!flag) {
      router.replace("/dashboard/billing")
      return
    }
    sessionStorage.removeItem("pages_purchased")
    setPack(findPagePack(flag))
    setConfirmed(true)
  }, [router])

  if (!confirmed) return null

  return (
    <div className="app-shell min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Payment received
          </h1>
          <p className="text-muted-foreground">
            {pack ? `${pack.pages.toLocaleString()} pages have` : "Your pages have"} been added to
            your balance. They never expire, and they are spent one page at a time as your API
            calls come in.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
          <p className="text-sm text-muted-foreground">
            The OCR API is only reachable with an API key, so that is the next stop.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/dashboard/api-keys">
                <KeyRound />
                Create an API key
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/docs">
                <BookOpen />
                Read the docs
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Your receipt is on its way by email. A balance that still looks stale is just the
          payment webhook catching up; refresh{" "}
          <Link href="/dashboard/billing" className="text-primary underline underline-offset-4">
            billing
          </Link>{" "}
          in a moment.
        </p>
      </div>
    </div>
  )
}
