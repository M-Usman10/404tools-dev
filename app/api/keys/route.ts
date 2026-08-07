import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { generateApiKey, hashApiKey, keyPrefixOf } from "@/lib/api-keys"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Twenty live keys is far more than the "one per environment, one per service"
// pattern this is actually for, while still being a ceiling: without one, a
// scripted loop could fill the table on our dime.
const MAX_LIVE_KEYS = 20

const MAX_NAME_LENGTH = 64
const DEFAULT_KEY_NAME = "API key"

// Everything the dashboard is allowed to see. key_hash is absent by
// construction rather than filtered later, so no future edit to this route can
// accidentally leak it.
const KEY_COLUMNS = "id, name, key_prefix, last_used_at, request_count, created_at"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Revoked keys are kept in the table so usage history still resolves, but
  // they are not part of the list a user manages.
  const { data, error } = await supabase
    .from("api_keys")
    .select(KEY_COLUMNS)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[api-keys] List failed:", error)
    return NextResponse.json({ error: "Could not load your API keys." }, { status: 500 })
  }

  return NextResponse.json({ keys: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let name = DEFAULT_KEY_NAME
  try {
    const body = (await request.json()) as { name?: unknown }
    if (typeof body?.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, MAX_NAME_LENGTH)
    }
  } catch {
    // An empty or unparseable body just means "make me a key", which is a
    // reasonable thing to ask for and not worth a 400.
  }

  const { count, error: countError } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null)

  if (countError) {
    console.error("[api-keys] Count failed:", countError)
    return NextResponse.json({ error: "Could not create an API key." }, { status: 500 })
  }

  if ((count ?? 0) >= MAX_LIVE_KEYS) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_LIVE_KEYS} active API keys. Revoke one first.` },
      { status: 400 },
    )
  }

  const key = generateApiKey()

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_hash: hashApiKey(key),
      key_prefix: keyPrefixOf(key),
    })
    .select(KEY_COLUMNS)
    .single()

  if (error || !data) {
    console.error("[api-keys] Create failed:", error)
    return NextResponse.json({ error: "Could not create an API key." }, { status: 500 })
  }

  // The only time the plaintext key ever exists outside the caller's hands.
  // Only its sha256 digest was stored, so if this response is lost the key is
  // unrecoverable and the user has to revoke it and make another one. The
  // dashboard has to show it immediately and say so.
  return NextResponse.json({ key: { ...data, plaintext: key } }, { status: 201 })
}
