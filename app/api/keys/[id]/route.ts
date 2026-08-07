import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Revoking sets revoked_at rather than deleting the row: ocr_usage points at
// this key, and a user looking at last month's spend should still see which key
// spent it.
export async function DELETE(
  _request: NextRequest,
  // Route params are a Promise as of Next 16 and have to be awaited; the old
  // synchronous shape is gone, not merely deprecated.
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Postgres rejects a malformed uuid with an error rather than an empty
  // result, which would surface as a confusing 500.
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Scoped to the caller's own row, so someone else's key id is a 404 rather
  // than a revocation. The revoked_at filter also makes a repeated request
  // idempotent instead of resetting the revocation time.
  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id")

  if (error) {
    console.error("[api-keys] Revoke failed:", error)
    return NextResponse.json({ error: "Could not revoke that API key." }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ revoked: true, id })
}
