"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

// Finishes an email confirmation whose session arrived in the URL fragment.
// See the comment in page.tsx for why the server cannot do this itself.
//
// setSession writes the same cookies the server flow would, because the browser
// client is the @supabase/ssr one, so by the time we navigate on, the session is
// readable server-side and the dashboard renders authenticated on first paint.
export function CallbackFallback({ destination }: { destination: string }) {
  const router = useRouter()
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    const p = new URLSearchParams(hash)

    // Supabase reports a dead link in the fragment too, so read the failure from
    // the same place rather than assuming anything absent means success.
    const errorCode = p.get("error_code")
    const errorDesc = p.get("error_description")
    if (errorCode || errorDesc) {
      if (errorCode === "otp_expired" || p.get("type") === "recovery") {
        router.replace(
          "/forgot-password?error=That+link+has+expired+or+was+already+used.+Request+a+new+one."
        )
        return
      }
      setFailed(errorDesc?.replace(/\+/g, " ") ?? "That link is no longer valid.")
      return
    }

    const accessToken = p.get("access_token")
    const refreshToken = p.get("refresh_token")

    if (!accessToken || !refreshToken) {
      setFailed("This confirmation link is missing its session. Please request a new one.")
      return
    }

    const target = p.get("type") === "recovery" ? "/reset-password" : destination

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setFailed(error.message)
          return
        }
        // Drop the tokens out of the address bar before moving on, so they are not
        // left sitting in history or copied out of the URL.
        window.history.replaceState(null, "", window.location.pathname)
        router.replace(target)
        router.refresh()
      })
  }, [destination, router])

  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-mono text-lg text-primary">[ ]</p>
        {failed ? (
          <>
            <h1 className="font-display mt-3 text-lg font-semibold text-foreground">
              That link did not work
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{failed}</p>
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
