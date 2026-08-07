import Link from "next/link"

/**
 * The shipped landing page and the standalone tools keep the original 404tools
 * black-and-green look, so the product surfaces opt into the emerald palette by
 * rendering inside .app-shell rather than by redefining the tokens on :root.
 *
 * The brand lock-up and the centred column live here because every auth screen
 * wears them identically; the pages themselves supply only their card.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <span className="font-mono text-2xl text-primary">[ ]</span>
        <span className="font-display text-2xl font-bold text-foreground">404tools.dev</span>
      </Link>

      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
