import { NextResponse, type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createAdminClient } from "@/lib/supabase/admin"
import { authenticateApiKey } from "@/lib/api-keys"
import { getBalance } from "@/lib/ocr-credits"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Same reasoning as the OCR endpoint: the credential is an explicit Bearer
// header rather than a cookie, so there is no ambient authority to protect and
// no reason to refuse a browser caller.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
  "Access-Control-Max-Age": "86400",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Lets an integration check its remaining pages without spending one, which is
// what makes it possible to warn a user before a batch job runs the balance
// dry mid-run.
export async function GET(request: NextRequest) {
  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error("[account] Admin client unavailable:", error)
    return NextResponse.json(
      { error: "The API is not configured on this deployment.", code: "server_misconfigured" },
      { status: 500, headers: CORS_HEADERS },
    )
  }

  const auth = await authenticateApiKey(admin, request.headers.get("authorization"))
  if (!auth) {
    return NextResponse.json(
      {
        error: "Invalid or missing API key. Send it as an Authorization: Bearer header.",
        code: "invalid_api_key",
      },
      { status: 401, headers: CORS_HEADERS },
    )
  }

  try {
    const balance = await getBalance(admin, auth.userId)
    return NextResponse.json(balance, { headers: CORS_HEADERS })
  } catch (error) {
    console.error("[account] Balance read failed:", error)
    return NextResponse.json(
      { error: "Could not read your page balance.", code: "accounting_failed" },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
