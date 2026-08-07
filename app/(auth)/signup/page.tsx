import type { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { PAGE_PACKS } from "@/lib/page-packs"

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a 404tools.dev account to get an OCR API key. Prepaid page packs, no subscription.",
  alternates: { canonical: "https://404tools.dev/signup" },
}

export default function SignupPage() {
  // The cheapest pack is the number that actually sets expectations here, and it
  // comes from the catalogue so the copy cannot drift away from the checkout.
  const cheapestPack = PAGE_PACKS.reduce((lowest, pack) =>
    pack.usd < lowest.usd ? pack : lowest
  )

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
        {/* A new account starts at zero pages, so the honest promise is a free key
            and prepaid credit — never a free trial or an included allowance. */}
        <p className="text-muted-foreground mt-2">
          Free to create, and you get an API key straight away. Pages are prepaid. Packs start at $
          {cheapestPack.usd} for {cheapestPack.pages.toLocaleString()} pages, no subscription.
        </p>
      </div>

      <SignupForm />

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </div>
    </div>
  )
}
