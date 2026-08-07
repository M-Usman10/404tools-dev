import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSafeNextPath, getSiteUrl } from '@/lib/site-url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Never derive the origin from request.url: on a proxied host it reflects the
  // bind address (0.0.0.0), not the public host the user is actually on.
  const origin = getSiteUrl()
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = getSafeNextPath(searchParams.get('next'))

  console.log("[auth/callback] code:", !!code, "token_hash:", !!token_hash, "type:", type, "next:", next)

  const supabase = await createClient()

  // Handle PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log("[auth/callback] PKCE exchange error:", error?.message ?? "none", "→ destination:", type === 'recovery' ? '/reset-password' : next)
    if (!error) {
      const destination = type === 'recovery' ? '/reset-password' : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Handle email OTP / magic link (token_hash flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as EmailOtpType })
    if (!error) {
      const destination = type === 'recovery' ? '/reset-password' : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // A recovery link that has expired or been clicked twice arrives here with no
  // code and no token_hash, and telling that user to log in is the one thing
  // they cannot do — they are here because they forgot the password. The type
  // parameter survives Supabase's own error redirect, so the right destination
  // is known.
  if (type === 'recovery' || searchParams.get('error_code') === 'otp_expired') {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=That+reset+link+has+expired+or+was+already+used.+Request+a+new+one.`
    )
  }

  // If neither worked, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=Could+not+verify+email.+Please+try+logging+in.`)
}
