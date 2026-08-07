import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { ApiKeysContent, type ApiKey } from "@/components/dashboard/api-keys-content"
import { createClient, getCachedUser } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "API Keys",
  description: "Create and revoke the Bearer keys that authenticate your OCR API requests.",
}

// Rendered on the server rather than fetched from /api/keys on mount, so the
// table is in the first paint instead of arriving after a spinner. The route
// handler still exists because the create and revoke actions need it.
export default async function ApiKeysPage() {
  const user = await getCachedUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  // key_hash is deliberately absent from the selection. Revoked keys are kept
  // in the table so old usage rows still resolve, but they are not part of the
  // list a user manages.
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, request_count, created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[api-keys] Page load failed:", error)
  }

  const keys = (data ?? []) as ApiKey[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          API Keys
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every OCR request is authenticated with one of these. Keys are shown in full exactly
          once, when you create them.
        </p>
      </div>

      <ApiKeysContent initialKeys={keys} />
    </div>
  )
}
