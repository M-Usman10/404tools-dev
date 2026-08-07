"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { signup, resendConfirmationEmail } from "@/lib/actions/auth"

interface PasswordRule {
  label: string
  test: (pw: string) => boolean
}

// These three rules are the client-side mirror of STRONG_PASSWORD_REGEX in
// lib/password-validation.ts, which is what the server action actually enforces.
export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "Contains uppercase and lowercase letters", test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "Contains a number", test: (pw) => /\d/.test(pw) },
]

// Exported because the reset-password form has to hold the new password to exactly
// the rules signup advertised; a second copy of the list would drift.
export function PasswordChecklist({ password, touched }: { password: string; touched: boolean }) {
  return (
    <ul className="mt-2 space-y-1 list-none">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password)
        // A rule only turns red once the field has been touched, so an empty form
        // reads as neutral guidance rather than as a wall of validation errors.
        const failed = touched && !passed
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${
              passed ? "text-green-600" : failed ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {passed && <Check className="h-3.5 w-3.5 shrink-0" />}
            {failed && <X className="h-3.5 w-3.5 shrink-0" />}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}

const COOLDOWN_SECONDS = 60

function ResendButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [countdown, setCountdown] = useState(COOLDOWN_SECONDS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // The confirmation email has only just gone out, so the button starts the panel
  // already in cooldown rather than inviting an immediate duplicate send.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [])

  async function handleResend() {
    if (countdown > 0 || status === "sending") return
    setStatus("sending")
    const { error } = await resendConfirmationEmail(email)
    if (error) {
      setStatus("error")
      return
    }
    setStatus("sent")
    setCountdown(COOLDOWN_SECONDS)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="space-y-2">
      {status === "sent" && (
        <p className="text-sm text-green-600">Confirmation email sent. Check your inbox.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive">Failed to resend. Please try again.</p>
      )}
      <Button
        type="button"
        className="w-full h-11"
        onClick={handleResend}
        disabled={status === "sending" || countdown > 0}
      >
        {status === "sending"
          ? <Spinner className="h-4 w-4" />
          : countdown > 0
          ? `Resend available in ${countdown}s`
          : "Resend confirmation email"}
      </Button>
    </div>
  )
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)
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

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password))

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordTouched(true)

    if (!allRulesPassed) return

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the bot check.")
      return
    }

    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    setSubmittedEmail((formData.get("email") as string) || "")
    const pw = (formData.get("password") as string) || ""
    const confirmPassword = (formData.get("confirmPassword") as string) || ""

    if (pw !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (turnstileToken) {
      formData.set("cf-turnstile-response", turnstileToken)
    }

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      resetTurnstile()
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground">Check your email</h3>
        <p className="text-muted-foreground">
          We&apos;ve sent you a confirmation link. Verify your address and your dashboard,
          API keys and page balance are waiting.
        </p>
        {submittedEmail && (
          <ResendButton email={submittedEmail} />
        )}
      </div>
    )
  }

  return (
    <>
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      onLoad={renderTurnstile}
      strategy="lazyOnload"
    />
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Ada Lovelace"
          required
          autoComplete="name"
          disabled={isLoading}
        />
      </div>

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
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            required
            autoComplete="new-password"
            disabled={isLoading}
            className="pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
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
        <PasswordChecklist password={password} touched={passwordTouched} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm your password"
            required
            autoComplete="new-password"
            disabled={isLoading}
            minLength={8}
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

      <div className="flex items-start gap-2">
        <input
          id="tos"
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input accent-primary cursor-pointer"
          disabled={isLoading}
        />
        <label htmlFor="tos" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
          I agree to the{" "}
          <a href="/terms" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </label>
      </div>

      {TURNSTILE_SITE_KEY && (
        <div ref={turnstileRef} />
      )}

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isLoading || !tosAccepted || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
      >
        {isLoading ? <Spinner className="h-4 w-4" /> : "Create account"}
      </Button>
    </form>
    </>
  )
}
