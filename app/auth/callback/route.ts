import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSafeNextPath, getSiteUrl } from '@/lib/site-url'

// This has to be a Route Handler, not a page. Establishing a session means
// writing the auth cookies, and Next only permits that from a Route Handler or a
// Server Action. In a Server Component cookies().set() throws, and the setAll in
// lib/supabase/server.ts swallows that by design, so a page-based callback
// appears to succeed, redirects to /dashboard, and arrives with no session at
// all. The middleware then bounces the user to /login.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Never derive the origin from request.url: on a proxied host it reflects the
  // bind address, not the public host the user is actually on.
  const origin = getSiteUrl()
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = getSafeNextPath(searchParams.get('next'))
  const destination = type === 'recovery' ? '/reset-password' : next

  const supabase = await createClient()

  // Preferred path. A token_hash is bound to the account rather than to the
  // browser that started the signup, so it still works when the confirmation
  // email is opened on a phone, in another profile, or in a private window.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (!error) return NextResponse.redirect(`${origin}${destination}`)
    console.error('[auth/callback] verifyOtp failed:', error.message)
  }

  // PKCE. Kept for links already in flight, but it can only succeed in the same
  // browser that began the signup: the exchange needs the code_verifier cookie
  // stored back then. Opened anywhere else it fails with nothing wrong on the
  // account, which is why the email templates are pointed at token_hash instead.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${destination}`)
    console.error('[auth/callback] PKCE exchange failed:', error.message)
    // Falling through rather than erroring: a PKCE link opened in the wrong
    // browser still carries a usable session in its fragment on some flows, and
    // the confirm page below is the only thing that can read it.
  }

  // An expired or already-used recovery link arrives with nothing usable, and
  // telling that person to log in is the one thing they cannot do, because they
  // are here having forgotten the password.
  if (type === 'recovery' || searchParams.get('error_code') === 'otp_expired') {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=That+reset+link+has+expired+or+was+already+used.+Request+a+new+one.`
    )
  }

  // Nothing usable in the query string. The session may still be sitting in the
  // URL fragment, which never reaches a server: the browser strips everything
  // after '#' before the request is sent. Hand off to a client page, which is
  // the only place that fragment is readable. Browsers re-attach the fragment
  // across a redirect, so it survives this hop.
  const handoff = new URL('/auth/confirm', origin)
  if (type) handoff.searchParams.set('type', type)
  if (next !== '/dashboard') handoff.searchParams.set('next', next)
  return NextResponse.redirect(handoff.toString())
}
