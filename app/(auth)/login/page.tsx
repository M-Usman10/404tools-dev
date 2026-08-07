import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Log in to 404tools.dev to manage your OCR API keys, track page usage, and top up your balance.",
  alternates: { canonical: "https://404tools.dev/login" },
}

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground mt-2">
          Log in to manage your OCR API keys, watch your page usage, and top up your balance.
        </p>
      </div>

      {/* The form reads ?next= and ?error= from the URL, so it has to sit behind a
          Suspense boundary for the route to stay statically prerenderable. */}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <LoginForm />
      </Suspense>

      <div className="mt-6 flex flex-col gap-3 text-center text-sm text-muted-foreground">
        <div>
          {"Don't have an account? "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </div>
        <Link href="/forgot-password" className="hover:text-foreground transition-colors">
          Forgot your password?
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { stat: "Prepaid", label: "No subscription" },
            { stat: "One endpoint", label: "POST /api/v1/ocr" },
            { stat: "PDF & images", label: "Up to 50 MB" },
          ].map(({ stat, label }) => (
            <div key={stat}>
              <p className="text-xs font-semibold text-foreground">{stat}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
