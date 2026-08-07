import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Billing state changes underneath the client (the Paddle webhook credits pages
// out of band, and every OCR call debits them), and this is the endpoint the
// dashboard trusts over the server-rendered profile. Without this it is an
// ordinary cacheable GET, so a browser can keep serving a balance captured
// before the purchase landed.
export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, pages_balance, pages_used_total, paddle_customer_id, created_at")
    .eq("id", user.id)
    .single()

  // Newest first because the billing page shows this as a receipt list and the
  // most recent purchase is the one anyone is looking for.
  const { data: purchases } = await supabase
    .from("page_purchases")
    .select("id, pack_id, pages, amount_cents, currency, paddle_transaction_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return NextResponse.json(
    { profile, purchases: purchases ?? [] },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  )
}
