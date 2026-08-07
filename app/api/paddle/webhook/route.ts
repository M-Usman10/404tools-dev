import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findPagePack, type PagePack, type PagePackId } from "@/lib/page-packs"

// crypto.subtle is available on the edge runtime too, but the raw-body read and
// the service-role Supabase client both want Node, and a runtime switch here
// would silently break signature verification.
export const runtime = "nodejs"

// The same env map the checkout route builds its transactions from. The pack a
// completed transaction credits is resolved through this rather than through
// custom_data, because custom_data is set by whoever opened the checkout and
// Paddle.js can be driven from the browser console on our own domain: a $9
// starter price could otherwise be labelled as the $499 bulk pack.
const PACK_PRICE_IDS: Record<PagePackId, string | undefined> = {
  starter: process.env.PADDLE_PAGES_PRICE_ID_STARTER,
  growth: process.env.PADDLE_PAGES_PRICE_ID_GROWTH,
  scale: process.env.PADDLE_PAGES_PRICE_ID_SCALE,
}

// Paddle sends a signature header we must verify to ensure the request is genuine.
// Uses HMAC-SHA256: https://developer.paddle.com/webhooks/signature-verification
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((part) => part.split("=", 2) as [string, string])
  )

  const timestamp = parts["ts"]
  const h1 = parts["h1"]

  if (!timestamp || !h1) return false

  const signed = `${timestamp}:${rawBody}`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed))
  const computed = Buffer.from(sig)

  // Constant time, so the response cannot be timed to walk the expected digest
  // one hex character at a time. timingSafeEqual throws on a length mismatch,
  // which is itself not secret: the digest length is fixed and public.
  let provided: Buffer
  try {
    provided = Buffer.from(h1, "hex")
  } catch {
    return false
  }

  if (provided.length !== computed.length) return false

  return timingSafeEqual(computed, provided)
}

// The grand total in minor units, which is where Paddle puts it on both
// transactions and adjustments.
function grandTotalCents(data: Record<string, unknown>): number | null {
  const totals = (data.details as Record<string, unknown>)?.totals as
    | Record<string, unknown>
    | undefined
  return totals?.grand_total != null ? Number(totals.grand_total) : null
}

interface PricedPack {
  pack: PagePack
  pages: number
}

// Resolve what was actually bought from the transaction's own line items, which
// are Paddle's record of what the customer was charged for. A line item carries
// its price either as a nested object or, on some payloads, as a bare price_id.
function packFromLineItems(data: Record<string, unknown>): PricedPack | null {
  const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : []

  for (const item of items) {
    const price = item.price as { id?: string } | undefined
    const priceId = price?.id ?? (item.price_id as string | undefined)
    if (!priceId) continue

    const packId = (Object.keys(PACK_PRICE_IDS) as PagePackId[]).find(
      (id) => PACK_PRICE_IDS[id] === priceId
    )
    const pack = packId ? findPagePack(packId) : null
    if (!pack) continue

    // Quantity is part of what Paddle collected, so honouring it is the honest
    // reading of the payment. Our own checkout always sends one.
    const rawQuantity = Number(item.quantity ?? 1)
    const quantity =
      Number.isFinite(rawQuantity) && rawQuantity >= 1 ? Math.floor(rawQuantity) : 1

    return { pack, pages: pack.pages * quantity }
  }

  return null
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[Paddle Webhook] PADDLE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  // The signature covers the bytes Paddle sent, so the body has to be read as
  // text before anything parses it. Reading it as JSON first consumes the
  // stream and leaves nothing to hash, and the signature would never verify.
  const rawBody = await request.text()
  const signatureHeader = request.headers.get("paddle-signature") ?? ""

  const isValid = await verifyPaddleSignature(rawBody, signatureHeader, webhookSecret)
  if (!isValid) {
    console.warn("[Paddle Webhook] Invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = event.event_type as string
  const data = event.data as Record<string, unknown>

  console.log(`[Paddle Webhook] Received event: ${eventType}`)

  const supabase = createAdminClient()

  try {
    switch (eventType) {
      // A page pack was paid for. This is the only event that adds pages to an
      // account, and the only one that has to be exactly-once.
      case "transaction.completed": {
        const customData = data.custom_data as Record<string, string> | null
        const userId = customData?.user_id
        if (!userId) {
          console.error("[Paddle Webhook] No user_id in custom_data", data)
          break
        }

        const priced = packFromLineItems(data)
        if (!priced) {
          console.error(
            `[Paddle Webhook] No known page pack among the line items of ${data.id as string}`
          )
          break
        }

        // custom_data is only a cross-check now. A disagreement means either a
        // stale checkout link or someone driving Paddle.js by hand, and either
        // way the pack that was paid for is the one that gets credited.
        if (customData.page_pack && customData.page_pack !== priced.pack.id) {
          console.error(
            `[Paddle Webhook] custom_data claims pack "${customData.page_pack}" but the`,
            `line items priced "${priced.pack.id}" on ${data.id as string}; crediting what was paid for`
          )
        }

        const totals = (data.details as Record<string, unknown>)?.totals as
          | Record<string, unknown>
          | undefined

        // The insert and the credit happen inside one SECURITY DEFINER function
        // so they share a transaction. Two round trips from here meant a failure
        // between them left the customer charged, the receipt row written, and
        // the balance still zero — and unrecoverable by replay, because the
        // retry would hit the unique violation and stop before crediting.
        const { data: newBalance, error: purchaseError } = await supabase.rpc(
          "ocr_record_purchase",
          {
            p_user_id: userId,
            p_transaction_id: data.id as string,
            p_pack_id: priced.pack.id,
            p_pages: priced.pages,
            p_amount_cents: totals?.grand_total != null ? Number(totals.grand_total) : null,
            p_currency:
              (totals?.currency_code as string | undefined) ??
              (data.currency_code as string | null) ??
              null,
          }
        )

        if (purchaseError) {
          // Answering 5xx is the point: Paddle redelivers, and because the
          // function is atomic and keyed on the transaction id the retry either
          // completes the whole thing or finds it already done.
          console.error("[Paddle Webhook] Failed to record purchase:", purchaseError)
          return NextResponse.json({ error: "Could not record purchase" }, { status: 500 })
        }

        if (newBalance === -2) {
          console.log(`[Paddle Webhook] Transaction ${data.id as string} already credited`)
          break
        }

        if (typeof newBalance !== "number" || newBalance < 0) {
          console.error(
            `[Paddle Webhook] ocr_record_purchase refused ${data.id as string} for user ${userId}`
          )
          return NextResponse.json({ error: "Could not record purchase" }, { status: 500 })
        }

        console.log(`[Paddle Webhook] Added ${priced.pages} pages to ${userId}`)
        break
      }

      // Nothing to revoke: pages are only ever added by a payment that actually
      // completed, so a failure just means the customer never got them. Logged
      // because a run of these is usually a card problem worth chasing.
      case "transaction.payment_failed": {
        const customData = data.custom_data as Record<string, string> | null
        console.warn(
          `[Paddle Webhook] Payment failed for transaction ${data.id as string}`,
          `user=${customData?.user_id ?? "unknown"} pack=${customData?.page_pack ?? "unknown"}`
        )
        break
      }

      // Refunds, credits and chargebacks all arrive as adjustments against the
      // original transaction.
      case "adjustment.created": {
        const transactionId = data.transaction_id as string | undefined
        const action = data.action as string | undefined
        if (!transactionId) break

        const { data: purchase } = await supabase
          .from("page_purchases")
          .select("id, user_id, pages, amount_cents, refunded_at")
          .eq("paddle_transaction_id", transactionId)
          .maybeSingle()

        if (!purchase) {
          console.warn(`[Paddle Webhook] Adjustment for unknown transaction ${transactionId}`)
          break
        }

        const adjustedCents = grandTotalCents(data)
        const isFullRefund =
          (action === "refund" || action === "chargeback") &&
          purchase.amount_cents != null &&
          adjustedCents != null &&
          adjustedCents >= purchase.amount_cents

        console.log(
          `[Paddle Webhook] Adjustment ${action ?? "unknown"} on ${transactionId}:`,
          `${adjustedCents ?? "?"} of ${purchase.amount_cents ?? "?"} cents,`,
          `full=${isFullRefund}`
        )

        if (!isFullRefund) break

        // The credit path is exactly-once because of the unique transaction id;
        // the clawback needs its own claim, or a redelivered adjustment debits
        // the same pages twice and destroys balance the customer still owns.
        // This update only matches while refunded_at is still null, so exactly
        // one delivery gets to perform the debit.
        const { data: claimed, error: claimError } = await supabase
          .from("page_purchases")
          .update({ refunded_at: new Date().toISOString() })
          .eq("id", purchase.id)
          .is("refunded_at", null)
          .select("id")
          .maybeSingle()

        if (claimError) {
          console.error("[Paddle Webhook] Failed to claim refund:", claimError)
          return NextResponse.json({ error: "Could not process refund" }, { status: 500 })
        }

        if (!claimed) {
          console.log(`[Paddle Webhook] Refund for ${transactionId} already applied`)
          break
        }

        // Revoking rather than consuming: the debit RPC the OCR path uses also
        // increments pages_used_total, which would report a refunded pack as
        // thousands of pages used against an empty usage table. ocr_revoke_pages
        // touches the balance only and clamps at zero, so a customer who spent
        // part of a pack before refunding lands on empty rather than in a hole.
        const { error: clawbackError } = await supabase.rpc("ocr_revoke_pages", {
          p_user_id: purchase.user_id,
          p_pages: purchase.pages,
        })

        if (clawbackError) {
          console.error("[Paddle Webhook] Failed to claw back pages:", clawbackError)
          // Release the claim so the redelivery can try again, then ask for one.
          await supabase
            .from("page_purchases")
            .update({ refunded_at: null })
            .eq("id", purchase.id)
          return NextResponse.json({ error: "Could not process refund" }, { status: 500 })
        }

        console.log(
          `[Paddle Webhook] Clawed back up to ${purchase.pages} pages from ${purchase.user_id} after refund`
        )
        break
      }

      default:
        // Acknowledge unhandled event types — don't return 4xx or Paddle will retry
        console.log(`[Paddle Webhook] Unhandled event type: ${eventType}`)
    }
  } catch (err) {
    console.error("[Paddle Webhook] Database update failed:", err)
    return NextResponse.json({ error: "Database update failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
