import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUser } from "@/lib/actions/auth"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Choose a new password for your 404tools.dev account.",
}

// This route sits outside the (auth) group because the recovery link lands here
// directly, so it applies the .app-shell wrapper and the brand lock-up itself.
export default async function ResetPasswordPage() {
  const user = await getUser()

  // If no session, the reset link is invalid/expired — send to forgot-password
  if (!user) {
    redirect("/forgot-password")
  }

  return (
    <div className="app-shell min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <span className="font-mono text-2xl text-primary">[ ]</span>
        <span className="font-display text-2xl font-bold text-foreground">404tools.dev</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Set new password</h1>
            <p className="text-muted-foreground mt-2">
              Choose a strong password for your 404tools.dev account
            </p>
          </div>

          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
