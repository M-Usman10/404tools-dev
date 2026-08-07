import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSiteUrl } from "@/lib/site-url"
import {
  DEFAULT_PAGE_PACK_ID,
  findPagePack,
  type PagePackId,
} from "@/lib/page-packs"
import { ensurePaddleCustomerId } from "@/lib/paddle-customer"

// Paddle price ids for the one-time page packs, keyed by pack id. Each one is a
// separate one-time price in the Paddle catalog; there is no subscription price
// anywhere in this product.
const PACK_PRICE_IDS: Record<PagePackId, string | undefined> = {
  starter: process.env.PADDLE_PAGES_PRICE_ID_STARTER,
  growth: process.env.PADDLE_PAGES_PRICE_ID_GROWTH,
  scale: process.env.PADDLE_PAGES_PRICE_ID_SCALE,
}

// Creates a Paddle transaction for a one-time page pack and returns the URL of
// our own overlay-checkout page, which opens the Paddle overlay against it.
export async function POST(request: Request) {
  const paddleApiKey = process.env.PADDLE_API_KEY

  const body = (await request.json().catch(() => ({}))) as { pack?: string }
  const pack = findPagePack(body.pack ?? DEFAULT_PAGE_PACK_ID)
  if (!pack) {
    return NextResponse.json({ error: "Unknown page pack" }, { status: 400 })
  }

  const priceId = PACK_PRICE_IDS[pack.id]
  if (!paddleApiKey || !priceId) {
    return NextResponse.json({ error: "Payment configuration missing" }, { status: 500 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("paddle_customer_id")
    .eq("id", user.id)
    .single()

  const isProd = process.env.PADDLE_ENVIRONMENT === "production"
  const paddleBaseUrl = isProd ? "https://api.paddle.com" : "https://sandbox-api.paddle.com"
  const siteUrl = getSiteUrl()

  // Attaching the customer here is what prefills (and locks) the email in the
  // overlay — without it the customer is only created once the user types it.
  const customerId = await ensurePaddleCustomerId({
    apiKey: paddleApiKey,
    baseUrl: paddleBaseUrl,
    email: user.email,
    existingId: profile?.paddle_customer_id,
  })

  if (customerId && customerId !== profile?.paddle_customer_id) {
    // Written with the service role rather than the caller's session: the
    // authenticated role only holds UPDATE on full_name, because a session that
    // could write paddle_customer_id could also point its own profile at
    // somebody else's Paddle customer.
    await createAdminClient()
      .from("profiles")
      .update({ paddle_customer_id: customerId })
      .eq("id", user.id)
  }

  const payload = {
    items: [{ price_id: priceId, quantity: 1 }],
    // The webhook has no session of its own, so custom_data is the only thing
    // tying a completed transaction back to an account and a pack size.
    custom_data: { user_id: user.id, page_pack: pack.id },
    ...(customerId ? { customer_id: customerId } : {}),
    checkout: {
      url: `${siteUrl}/dashboard/billing?purchase=success`,
    },
  }

  const res = await fetch(`${paddleBaseUrl}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paddleApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const responseBody = await res.json().catch(() => ({}))
  const transactionId = responseBody?.data?.id

  if (!res.ok || !transactionId) {
    console.error("[Paddle Checkout] Failed to create transaction:", JSON.stringify(responseBody))
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }

  return NextResponse.json({
    checkoutUrl: `${siteUrl}/checkout?_ptxn=${transactionId}&pack=${pack.id}`,
  })
}
