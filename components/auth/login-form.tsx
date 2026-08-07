"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import Script from "next/script"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Eye, EyeOff } from "lucide-react"
import { login } from "@/lib/actions/auth"
import { ResendConfirmationLink } from "@/components/auth/resend-confirmation-link"

const EMAIL_NOT_CONFIRMED_PATTERNS = [
  "email not confirmed",
  "email_not_confirmed",
  "not confirmed",
]

function isEmailNotConfirmedError(msg: string) {
  const lower = msg.toLowerCase()
  return EMAIL_NOT_CONFIRMED_PATTERNS.some((p) => lower.includes(p))
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

export function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  // The middleware parks the originally requested dashboard path on ?next= when it
  // bounces an unauthenticated visitor here, so it rides along as a hidden field and
  // the server action can send them back to where they were actually headed.
  const nextPath = searchParams.get("next") ?? ""
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(urlError || "")
  const [submittedEmail, setSubmittedEmail] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  const resetTurnstile = useCallback(() => {
    if (widgetIdRef.current !== null && typeof window !== "undefined" && (window as any).turnstile) {
      (window as any).turnstile.reset(widgetIdRef.current)
    }
    setTurnstileToken("")
  }, [])

  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current || !(window as any).turnstile || !TURNSTILE_SITE_KEY) return
    if (widgetIdRef.current !== null) return
    widgetIdRef.current = (window as any).turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    })
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the bot check.")
      return
    }

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    setSubmittedEmail(email)

    if (turnstileToken) {
      formData.set("cf-turnstile-response", turnstileToken)
    }

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      resetTurnstile()
    }
    setIsLoading(false)
  }

  const showResend = !!error && isEmailNotConfirmedError(error)

  return (
    <>
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      onLoad={renderTurnstile}
      strategy="lazyOnload"
    />
    <form onSubmit={onSubmit} className="space-y-4">
      {nextPath && <input type="hidden" name="next" value={nextPath} />}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {showResend
            ? "Your email hasn't been verified yet. Please check your inbox for a confirmation link, or resend it below."
            : error}
          {showResend && submittedEmail && (
            <div className="mt-1">
              <ResendConfirmationLink email={submittedEmail} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {TURNSTILE_SITE_KEY && (
        <div ref={turnstileRef} />
      )}

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
      >
        {isLoading ? <Spinner className="h-4 w-4" /> : "Log in"}
      </Button>
    </form>
    </>
  )
}
