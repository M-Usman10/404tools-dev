import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your 404tools.dev password. We'll email you a link to set a new one.",
}

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Reset your password</h1>
        <p className="text-muted-foreground mt-2">
          {"Enter your email and we'll send you a link to reset your password"}
        </p>
      </div>

      {/* The form reads ?error= from the URL — an expired reset link lands back
          here with one — so it has to sit behind a Suspense boundary for the
          route to stay statically prerenderable. */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        <ForgotPasswordForm />
      </Suspense>

      <div className="mt-6 flex flex-col gap-3 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
        <span>
          {"Don't have an account? "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </span>
      </div>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          We&apos;ll email you a secure reset link. Check your spam folder if it doesn&apos;t arrive
          within a minute. Your API keys and page balance are untouched — only your password
          changes.
        </p>
      </div>
    </div>
  )
}
