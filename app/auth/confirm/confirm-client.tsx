"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { getSafeNextPath } from "@/lib/site-url"

// The browser client writes the same cookies the server flow would, so once
// setSession resolves the session is readable server-side and the dashboard
// renders authenticated on the very next navigation.
export function ConfirmClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    const frag = new URLSearchParams(raw)

    const type = frag.get("type") ?? params.get("type")
    const target =
      type === "recovery" ? "/reset-password" : getSafeNextPath(params.get("next"))

    // Supabase reports a dead link in the fragment too, so read failure from the
    // same place rather than treating anything missing as success.
    const errorCode = frag.get("error_code")
    const errorDesc = frag.get("error_description")
    if (errorCode || errorDesc) {
      if (errorCode === "otp_expired" || type === "recovery") {
        router.replace(
          "/forgot-password?error=That+link+has+expired+or+was+already+used.+Request+a+new+one."
        )
        return
      }
      setFailed(decodeURIComponent(errorDesc ?? "").replace(/\+/g, " ") || "That link is no longer valid.")
      return
    }

    const accessToken = frag.get("access_token")
    const refreshToken = frag.get("refresh_token")

    if (!accessToken || !refreshToken) {
      setFailed(
        "This link could not be completed in this browser. Open it in the browser you signed up from, or request a new confirmation email."
      )
      return
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setFailed(error.message)
          return
        }
        // Drop the tokens out of the address bar before moving on, so they are not
        // left in history or copied out of the URL.
        window.history.replaceState(null, "", window.location.pathname)
        router.replace(target)
        router.refresh()
      })
  }, [params, router])

  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-mono text-lg text-primary">[ ]</p>
        {failed ? (
          <>
            <h1 className="font-display mt-3 text-lg font-semibold text-foreground">
              That link did not work
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{failed}</p>
            <a
              href="/login"
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Go to log in
            </a>
          </>
        ) : (
          <>
            <h1 className="font-display mt-3 text-lg font-semibold text-foreground">
              Confirming your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">One moment.</p>
          </>
        )}
      </div>
    </div>
  )
}
