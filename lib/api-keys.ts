// Issuing and verifying the Bearer keys that guard the OCR API. The plaintext
// key exists only in the response that creates it; everything stored here is a
// sha256 digest, so a leaked database dump yields nothing that can be replayed
// against the endpoint.
import "server-only"

import { createHash, randomBytes } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

const KEY_PREFIX = "tk_live_"

// 25 random bytes is 200 bits, which base32 encodes as exactly 40 characters
// with no padding. Choosing the byte count to land on a whole number of
// characters keeps every key the same length, which the documentation and the
// dashboard both quietly depend on.
const KEY_ENTROPY_BYTES = 25

// Lowercase RFC 4648 alphabet. Base32 rather than base64url because keys get
// read aloud, pasted out of terminals, and typed into config files, and a
// single case-insensitive alphabet with no punctuation survives all three.
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567"

// How much of the key the dashboard is allowed to show. Sixteen characters is
// "tk_live_" plus eight, which is enough to tell two keys apart and far too
// little to guess the rest.
const KEY_PREFIX_LENGTH = 16

function base32Encode(bytes: Buffer): string {
  let value = 0
  let bits = 0
  let out = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return out
}

export function generateApiKey(): string {
  return KEY_PREFIX + base32Encode(randomBytes(KEY_ENTROPY_BYTES))
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex")
}

export function keyPrefixOf(key: string): string {
  return key.slice(0, KEY_PREFIX_LENGTH)
}

export interface AuthenticatedKey {
  userId: string
  keyId: string
}

// Pull the credential out of an Authorization header. Returns an empty string
// rather than null for anything malformed, so the caller can go through the
// motions of a lookup either way and a client cannot tell "you sent nonsense"
// apart from "that key does not exist" by watching the clock.
function bearerToken(authorizationHeader: string | null | undefined): string {
  if (!authorizationHeader) return ""
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ""
}

// Record that a key was used. Deliberately not awaited by the caller: the
// counter and the timestamp are dashboard conveniences, and a failure to write
// them must never turn a successful, already-paid-for OCR request into an
// error. The read-modify-write can lose an increment under concurrency, which
// costs us an undercount on a display-only statistic and nothing else.
function touchKey(
  admin: SupabaseClient,
  keyId: string,
  requestCount: number,
): void {
  void admin
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      request_count: requestCount + 1,
    })
    .eq("id", keyId)
    .then(
      () => undefined,
      () => undefined,
    )
}

// Resolve an Authorization header to the user behind it, or null. Every failure
// mode returns the same null so the endpoint can answer with one indistinct
// 401: a missing header, a malformed header, an unknown key and a revoked key
// are all "not authenticated" and telling them apart only helps an attacker
// enumerate. The service-role client is required because this path carries no
// cookie session at all, so RLS on api_keys would match nothing.
export async function authenticateApiKey(
  admin: SupabaseClient,
  authorizationHeader: string | null | undefined,
): Promise<AuthenticatedKey | null> {
  const token = bearerToken(authorizationHeader)

  // Hashing the empty string is cheap and keeps the code path identical for a
  // missing credential, which is one less branch that could behave differently.
  const keyHash = hashApiKey(token)

  const { data, error } = await admin
    .from("api_keys")
    .select("id, user_id, request_count")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle()

  if (error || !data) return null

  touchKey(admin, data.id as string, Number(data.request_count ?? 0))

  return { userId: data.user_id as string, keyId: data.id as string }
}
