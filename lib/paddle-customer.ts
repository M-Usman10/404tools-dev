// Paddle's POST /transactions only reads a top-level `customer_id`. A nested
// `customer` object is accepted and silently dropped, which leaves the checkout
// overlay asking for an email address we already know — so resolve a `ctm_` id
// before creating the transaction.

interface EnsureCustomerArgs {
  apiKey: string
  baseUrl: string
  email: string | null | undefined
  existingId?: string | null
}

function authHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }
}

export async function ensurePaddleCustomerId({
  apiKey,
  baseUrl,
  email,
  existingId,
}: EnsureCustomerArgs): Promise<string | null> {
  if (existingId) return existingId
  if (!email) return null

  const created = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ email }),
  })
  const createdBody = await created.json().catch(() => ({}))

  if (created.ok && createdBody?.data?.id) {
    return createdBody.data.id as string
  }

  // Paddle 409s when the email already belongs to a customer — that happens for
  // anyone who reached the overlay before we started attaching customers, since
  // typing an email there creates the record. Look it up instead.
  const found = await fetch(
    `${baseUrl}/customers?email=${encodeURIComponent(email)}&status=active,archived`,
    { headers: authHeaders(apiKey) }
  )
  const foundBody = await found.json().catch(() => ({}))
  const foundId = foundBody?.data?.[0]?.id

  if (foundId) return foundId as string

  console.error(
    "[Paddle] Could not resolve a customer id:",
    JSON.stringify(createdBody),
    JSON.stringify(foundBody)
  )
  return null
}
