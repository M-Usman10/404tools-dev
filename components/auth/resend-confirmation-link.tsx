"use client"

import { useState, useEffect, useRef } from "react"
import { resendConfirmationEmail } from "@/lib/actions/auth"

const COOLDOWN_SECONDS = 60
const MAX_RETRIES = 5
const SESSION_KEY = "resend_confirmation_state"

interface ResendState {
  attempts: number
  cooldownUntil: number | null
}

function loadResendState(): ResendState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { attempts: 0, cooldownUntil: null }
}

function saveResendState(state: ResendState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {}
}

export function ResendConfirmationLink({ email }: { email: string }) {
  const [state, setState] = useState<ResendState>(() => loadResendState())
  const [countdown, setCountdown] = useState(0)
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // The cooldown deadline is persisted as an absolute timestamp so a reload in the
  // middle of the wait resumes where it left off instead of handing out a fresh
  // sixty seconds of free retries.
  useEffect(() => {
    const now = Date.now()
    if (state.cooldownUntil && state.cooldownUntil > now) {
      startCountdown(Math.ceil((state.cooldownUntil - now) / 1000))
    }
  }, [])

  // The interval outlives the component otherwise: leaving the page mid-cooldown
  // (the "Create one" link to /signup is right there) leaves it ticking on a
  // detached component for the rest of the minute.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function startCountdown(seconds: number) {
    setCountdown(seconds)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResend() {
    if (!email || countdown > 0 || state.attempts >= MAX_RETRIES) return

    setResendStatus("sending")
    const { error } = await resendConfirmationEmail(email)

    if (error) {
      setResendStatus("error")
      return
    }

    const cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000
    const newState: ResendState = { attempts: state.attempts + 1, cooldownUntil }
    setState(newState)
    saveResendState(newState)
    setResendStatus("sent")
    startCountdown(COOLDOWN_SECONDS)
  }

  if (state.attempts >= MAX_RETRIES) {
    return (
      <p className="text-xs text-muted-foreground">
        Too many attempts. Please{" "}
        <a href="mailto:support@404tools.dev" className="text-primary hover:underline">
          contact support
        </a>{" "}
        if you need help.
      </p>
    )
  }

  return (
    <div className="text-xs">
      {resendStatus === "sent" && countdown > 0 && (
        <p className="text-green-600 mb-1">Confirmation email sent — check your inbox.</p>
      )}
      {resendStatus === "error" && (
        <p className="text-destructive mb-1">Failed to resend. Please try again.</p>
      )}
      {countdown > 0 ? (
        <span className="text-muted-foreground">Resend available in {countdown}s</span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resendStatus === "sending"}
          className="text-primary hover:underline disabled:opacity-50"
        >
          {resendStatus === "sending" ? "Sending…" : "Resend confirmation email"}
        </button>
      )}
    </div>
  )
}
