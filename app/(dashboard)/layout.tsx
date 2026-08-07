import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { UserProvider } from "@/lib/user-context"
import { getUser, getProfile } from "@/lib/actions/auth"
import { Paywall } from "@/components/dashboard/paywall"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | 404tools.dev",
  },
  description: "Manage your OCR API keys, watch your usage, and buy prepaid page packs.",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Both reads are network round-trips against Supabase and neither depends on
  // the other, so they overlap rather than queue on the first paint.
  const [user, profile] = await Promise.all([getUser(), getProfile()])

  // Defence in depth behind the middleware redirect. Middleware can be skipped
  // by a matcher change or a route that slips past the pattern; this cannot.
  if (!user) {
    redirect("/login")
  }

  // Only the count matters, so this asks Postgres for the count and no rows at
  // all. head: true skips the body entirely, which keeps a gate that runs on
  // every dashboard navigation off the critical path.
  const supabase = await createClient()
  const { count } = await supabase
    .from("page_purchases")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id)

  const hasPurchased = (count ?? 0) > 0
  const profileWithPurchase = profile ? { ...profile, has_purchased: hasPurchased } : null

  // Gated accounts never reach a dashboard route: the layout wraps every page
  // under (dashboard), so swapping children here closes the whole section
  // rather than leaving individual pages to remember to check.
  //
  // The gate is "never bought a pack", not "balance is zero". A customer who
  // has spent everything still owns their API keys and their usage history and
  // needs the dashboard to top up; a brand-new account has nothing to see and
  // no way to call the API, so it gets the pitch instead.
  if (!hasPurchased) {
    return (
      <UserProvider initialUser={user} initialProfile={profileWithPurchase}>
        <div className="app-shell">
          <Paywall />
        </div>
      </UserProvider>
    )
  }

  return (
    <UserProvider initialUser={user} initialProfile={profileWithPurchase}>
      {/* The palette override is a class rather than a :root rule, because the
          shipped marketing landing and the standalone tools must keep their own
          look. Everything inside the shell opts in by living under it. */}
      <SidebarProvider className="app-shell">
        <DashboardSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex-1 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UserProvider>
  )
}
