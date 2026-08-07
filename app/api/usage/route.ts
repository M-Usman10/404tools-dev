import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_DAYS = 30
const MAX_DAYS = 365
const RECENT_LIMIT = 50

interface DailyBucket {
  date: string
  requests: number
  pages: number
}

interface DailyRow {
  day?: string
  requests?: number | string
  pages?: number | string
}

interface UsageRow {
  id: string
  api_key_id: string | null
  pages: number | null
  status: string
  model: string | null
  file_name: string | null
  file_bytes: number | string | null
  duration_ms: number | null
  error: string | null
  created_at: string
}

function parseDays(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_DAYS
  return Math.min(MAX_DAYS, Math.max(1, Math.floor(parsed)))
}

// Start of the reporting window in UTC, matching the bucketing the
// ocr_usage_daily rollup does. Both have to agree or the failure count would be
// taken over a different span than the chart it sits next to.
function windowStart(days: number): string {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start.toISOString()
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const days = parseDays(request.nextUrl.searchParams.get("days"))
  const since = windowStart(days)

  // The rollup resolves the caller with auth.uid(), so it has to run on the
  // cookie-session client. Handing it the service-role client would silently
  // aggregate nothing.
  const [dailyResult, recentResult, failedResult, keysResult] = await Promise.all([
    supabase.rpc("ocr_usage_daily", { p_days: days }),
    supabase
      .from("ocr_usage")
      .select(
        "id, api_key_id, pages, status, model, file_name, file_bytes, duration_ms, error, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from("ocr_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "failed")
      .gte("created_at", since),
    // Names for the keys the recent rows point at. Fetched separately rather
    // than as an embedded join so a revoked key, or one deleted out from under
    // an ocr_usage row, still resolves to something the table can render.
    supabase.from("api_keys").select("id, name, key_prefix").eq("user_id", user.id),
  ])

  if (dailyResult.error) {
    console.error("[usage] Daily rollup failed:", dailyResult.error)
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 })
  }
  if (recentResult.error) {
    console.error("[usage] Recent rows failed:", recentResult.error)
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 })
  }

  // The rollup already emits one bucket per day, zeroes included, so the chart
  // never has to reconstruct a gap.
  const daily: DailyBucket[] = ((dailyResult.data as DailyRow[] | null) ?? []).map((row) => ({
    date: String(row.day ?? ""),
    requests: Number(row.requests ?? 0),
    pages: Number(row.pages ?? 0),
  }))

  const keyNames = new Map<string, { name: string; prefix: string }>()
  for (const key of (keysResult.data ?? []) as { id: string; name: string; key_prefix: string }[]) {
    keyNames.set(key.id, { name: key.name, prefix: key.key_prefix })
  }

  const recent = ((recentResult.data as UsageRow[] | null) ?? []).map((row) => {
    const key = row.api_key_id ? keyNames.get(row.api_key_id) : undefined
    return {
      id: row.id,
      createdAt: row.created_at,
      pages: row.pages ?? 0,
      status: row.status,
      model: row.model,
      fileName: row.file_name,
      fileBytes: row.file_bytes === null ? null : Number(row.file_bytes),
      durationMs: row.duration_ms,
      error: row.error,
      keyId: row.api_key_id,
      keyName: key?.name ?? null,
      keyPrefix: key?.prefix ?? null,
    }
  })

  return NextResponse.json({
    days,
    since,
    daily,
    recent,
    totals: {
      requests: daily.reduce((sum, bucket) => sum + bucket.requests, 0),
      pages: daily.reduce((sum, bucket) => sum + bucket.pages, 0),
      // A count query rather than a sum over `recent`: the fifty newest rows
      // are a table, not a sample of the window.
      failed: failedResult.count ?? 0,
    },
  })
}
