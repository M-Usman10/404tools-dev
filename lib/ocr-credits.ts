// Page-balance accounting. Every read and write goes through here so there is
// exactly one place that knows how the balance is spelled in the database, and
// exactly one place that knows the debit RPC signals failure with -1 rather
// than an error.
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export interface PageBalance {
  pagesBalance: number
  pagesUsedTotal: number
}

// Thrown when a debit could not be paid for. It is a distinct type because the
// OCR route has to tell it apart from a genuine database failure: one means
// "charge the caller less", the other means "something is broken".
export class InsufficientPagesError extends Error {
  readonly requested: number

  constructor(requested: number) {
    super(`Insufficient page balance for ${requested} page(s).`)
    this.name = "InsufficientPagesError"
    this.requested = requested
  }
}

// Works with either client: the cookie-session client for the dashboard, where
// RLS scopes the row anyway, or the service-role client on the Bearer-key API
// path, where the user id came from the key hash.
export async function getBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<PageBalance> {
  const { data, error } = await supabase
    .from("profiles")
    .select("pages_balance, pages_used_total")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[ocr-credits] Failed to read balance:", error)
    throw new Error("Could not read page balance")
  }

  return {
    pagesBalance: data?.pages_balance ?? 0,
    pagesUsedTotal: data?.pages_used_total ?? 0,
  }
}

// Atomically debit pages and return the balance remaining afterwards. The
// SELECT ... FOR UPDATE lives in the RPC, so two concurrent OCR requests for
// the same user serialise on the profile row instead of both reading the same
// balance and both deciding they can afford it.
export async function consumePages(
  admin: SupabaseClient,
  userId: string,
  pages: number,
): Promise<number> {
  const { data, error } = await admin.rpc("ocr_consume_pages", {
    p_user_id: userId,
    p_pages: pages,
  })

  if (error) {
    console.error("[ocr-credits] Failed to consume pages:", error)
    throw new Error("Page accounting failed")
  }

  const remaining = typeof data === "number" ? data : Number(data)

  // -1 is the RPC's "could not be paid for" sentinel, which covers both an
  // insufficient balance and a nonsensical page count.
  if (!Number.isFinite(remaining) || remaining < 0) {
    throw new InsufficientPagesError(pages)
  }

  return remaining
}

// Credit a completed purchase. Called by the Paddle webhook under the service
// role; there is deliberately no session-authorized path to this.
export async function addPages(
  admin: SupabaseClient,
  userId: string,
  pages: number,
): Promise<number> {
  const { data, error } = await admin.rpc("ocr_add_pages", {
    p_user_id: userId,
    p_pages: pages,
  })

  if (error) {
    console.error("[ocr-credits] Failed to add pages:", error)
    throw new Error("Page accounting failed")
  }

  const balance = typeof data === "number" ? data : Number(data)

  // The RPC returns -1 when the profile is missing or the page count is
  // invalid. Silently reporting that as a balance would let a webhook record a
  // purchase that never landed.
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error(`Could not credit ${pages} page(s) to ${userId}`)
  }

  return balance
}
