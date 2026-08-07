import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getSafeNextPath } from "@/lib/site-url"
import { CallbackFallback } from "./callback-fallback"

// This is a page rather than a route handler because Supabase does not always
// return the session the same way.
//
// A PKCE signup comes back as ?code=..., and a magic link as ?token_hash=...&type=...
// Both are query parameters, so the server can read them and set the session
// cookies before the browser paints anything. That is the fast path and it is
// handled below.
//
// But an email link that was minted without a PKCE challenge — an admin-generated
// confirmation, a link issued from a server-side signUp, or a project still on the
// implicit flow — comes back as /auth/callback#access_token=...&refresh_token=...
// A URL fragment is never transmitted to the server: the browser strips everything
// from the '#' onward before the request leaves. A route handler therefore saw no
// code and no token_hash and fell through to "Could not verify email", stranding a
// user whose address had in fact just been confirmed. Only script running in the
// page can read that fragment, so when there is nothing in the query string we
// render a client component to finish the job.
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const one = (k: string) => {
    const v = params[k]
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : null
  }

  const code = one("code")
  const tokenHash = one("token_hash")
  const type = one("type")
  const next = getSafeNextPath(one("next"))
  const destination = type === "recovery" ? "/reset-password" : next

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect(destination)
  }

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (!error) redirect(destination)
  }

  // A recovery link that expired or was clicked twice arrives with neither, and
  // telling that person to log in is the one thing they cannot do — they are here
  // because they forgot the password. type survives Supabase's own error redirect,
  // so the right destination is still known.
  if (!code && !tokenHash && (type === "recovery" || one("error_code") === "otp_expired")) {
    redirect(
      "/forgot-password?error=That+reset+link+has+expired+or+was+already+used.+Request+a+new+one."
    )
  }

  // Nothing usable in the query string. Hand over to the client, which is the only
  // place the fragment is readable.
  return <CallbackFallback destination={destination} />
}
