import { isIP } from "node:net"
import { lookup } from "node:dns/promises"

import { NextResponse, type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { createAdminClient } from "@/lib/supabase/admin"
import { authenticateApiKey } from "@/lib/api-keys"
import { getBalance, consumePages, InsufficientPagesError } from "@/lib/ocr-credits"
import { runOcr, OcrError } from "@/lib/azure-ocr"

// Node runtime because the Azure call needs Buffer and node:crypto, and because
// a large PDF has to be held in memory while it is forwarded. The 300s ceiling
// is generous on purpose: a hundred-page scan can keep Azure busy for minutes,
// and timing out after the analysis has been paid for is the worst outcome
// available.
export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

const MAX_BYTES = 50 * 1024 * 1024

// Azure's prebuilt-read accepts these. Anything else is rejected before the
// bytes leave our network, so a caller gets a fast, clear 415 instead of a slow
// and cryptic provider error.
const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/bmp",
  "image/heif",
])

// Spellings that mean one of the above but are not what Azure wants to be told.
const TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/tif": "image/tiff",
  "image/x-tiff": "image/tiff",
  "image/x-ms-bmp": "image/bmp",
  "image/x-bmp": "image/bmp",
  "image/heic": "image/heif",
  "image/heic-sequence": "image/heif",
  "image/heif-sequence": "image/heif",
}

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  heic: "image/heif",
  heif: "image/heif",
}

const URL_FETCH_TIMEOUT_MS = 30_000
const MAX_URL_REDIRECTS = 3

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000

// Cross-origin use is allowed because the credential here is a Bearer key the
// caller attaches deliberately, not a cookie the browser would attach on its
// behalf. There is no ambient authority for a hostile page to borrow, so the
// usual reason to lock an API down by origin does not apply.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
}

// A request that failed our own validation rather than Azure's. Carries the
// status and machine-readable code the caller should see, so the handler can
// treat every rejection the same way.
class RequestError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = "RequestError"
    this.status = status
    this.code = code
  }
}

interface ParsedDocument {
  buffer: Buffer
  contentType: string
  fileName: string | null
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, ...extraHeaders },
  })
}

function errorResponse(
  message: string,
  status: number,
  code: string,
  extraHeaders?: Record<string, string>,
) {
  return jsonResponse({ error: message, code }, status, extraHeaders)
}

// Per-process sliding window, keyed by API key id. This is deliberately not a
// shared store: it exists to stop one runaway script from monopolising a single
// server instance, not to enforce a global quota. Across several instances a
// caller gets this allowance per instance, so anything resembling a real quota
// would need Redis or Postgres behind it.
const rateBuckets = new Map<string, number[]>()

function checkRateLimit(keyId: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  const hits = (rateBuckets.get(keyId) ?? []).filter((at) => at > windowStart)

  if (hits.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(keyId, hits)
    const retryAfterMs = hits[0] + RATE_LIMIT_WINDOW_MS - now
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  hits.push(now)
  rateBuckets.set(keyId, hits)

  // The map would otherwise grow one entry per key ever seen for the lifetime
  // of the process. Sweeping only when it gets big keeps the common path free.
  if (rateBuckets.size > 5_000) {
    for (const [id, timestamps] of rateBuckets) {
      if (timestamps.every((at) => at <= windowStart)) rateBuckets.delete(id)
    }
  }

  return { ok: true }
}

function normalizeMediaType(value: string | null | undefined): string {
  if (!value) return ""
  const base = value.split(";")[0].trim().toLowerCase()
  return TYPE_ALIASES[base] ?? base
}

function extensionOf(fileName: string | null): string {
  if (!fileName) return ""
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match ? match[1] : ""
}

// Magic-number sniffing, trusted ahead of whatever the caller declared. A file
// picked in a browser arrives as application/octet-stream often enough, and a
// URL fetch reports whatever the remote server felt like saying, so the bytes
// themselves are the only honest source.
function sniffContentType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  if (buffer.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf"
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg"
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png"
  }
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "image/tiff"
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return "image/bmp"

  // ISO base media container: the brand at offset 8 says whether it is HEIF.
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("latin1")
    if (["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand)) {
      return "image/heif"
    }
  }

  return null
}

function resolveContentType(
  declared: string | null | undefined,
  fileName: string | null,
  buffer: Buffer,
): string {
  const sniffed = sniffContentType(buffer)
  if (sniffed) return sniffed

  const normalized = normalizeMediaType(declared)
  if (SUPPORTED_TYPES.has(normalized)) return normalized

  const byExtension = EXTENSION_TYPES[extensionOf(fileName)]
  if (byExtension) return byExtension

  throw new RequestError(
    `Unsupported document type${normalized ? ` "${normalized}"` : ""}. Send a PDF, JPEG, PNG, TIFF, BMP or HEIF.`,
    415,
    "unsupported_media_type",
  )
}

function assertWithinSizeLimit(byteLength: number) {
  if (byteLength > MAX_BYTES) {
    throw new RequestError(
      `Document is larger than the ${Math.round(MAX_BYTES / (1024 * 1024))}MB limit.`,
      413,
      "document_too_large",
    )
  }
}

// Read a downloaded body while counting bytes, so a remote server that lies
// about (or omits) Content-Length cannot make us buffer an unbounded file.
async function readCapped(response: Response): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > 0) assertWithinSizeLimit(declared)

  const reader = response.body?.getReader()
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer())
    assertWithinSizeLimit(buffer.length)
    return buffer
  }

  const chunks: Uint8Array[] = []
  let total = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => undefined)
      assertWithinSizeLimit(total)
    }
    chunks.push(value)
  }

  return Buffer.concat(chunks)
}

// Every rejection on the URL path answers with exactly this. The distinctions
// worth making to a legitimate caller (DNS failure, connection refused, a 403
// from the far end) are the same distinctions that would let a caller use this
// endpoint to port-scan and fingerprint whatever our egress IP can reach, so
// the endpoint deliberately tells them apart for nobody.
function urlUnreachable(): RequestError {
  return new RequestError(
    "Could not download that URL. It must be a publicly reachable http(s) document.",
    400,
    "url_fetch_failed",
  )
}

// Address ranges that are either ours or nobody's: loopback, link-local (which
// is where the cloud metadata service lives), RFC1918, CGNAT, the benchmarking
// and multicast blocks. A URL that resolves into any of them is asking this
// server to fetch something on its own network on the caller's behalf.
function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }

  const [a, b] = parts

  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && (b === 0 || b === 168)) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true

  return false
}

function isPrivateIpv6(address: string): boolean {
  // A zone index ("%eth0") is not part of the address and confuses the parse.
  const normalized = address.toLowerCase().split("%")[0]

  if (normalized === "::" || normalized === "::1") return true

  // IPv4-mapped addresses reach IPv4 destinations, so they get the IPv4 rules.
  const mapped = normalized.startsWith("::ffff:") ? normalized.slice("::ffff:".length) : null
  if (mapped) return isIP(mapped) === 4 ? isPrivateIpv4(mapped) : true

  const firstGroup = Number.parseInt(normalized.split(":")[0] || "0", 16)
  if (!Number.isFinite(firstGroup)) return true
  if ((firstGroup & 0xfe00) === 0xfc00) return true // unique local, fc00::/7
  if ((firstGroup & 0xffc0) === 0xfe80) return true // link local, fe80::/10
  if ((firstGroup & 0xff00) === 0xff00) return true // multicast, ff00::/8

  return false
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return isPrivateIpv4(address)
  if (version === 6) return isPrivateIpv6(address)
  return true
}

// Resolve before connecting, and reject when any address the name answers with
// is private. This is checked again on every redirect hop, because a public host
// that 302s to 169.254.169.254 would otherwise walk straight through a check
// applied only to the URL the caller submitted.
async function assertPubliclyRoutable(target: URL): Promise<void> {
  if (target.protocol !== "http:" && target.protocol !== "https:") throw urlUnreachable()

  // A non-default port is how an internal service is usually reached, and no
  // ordinary document lives on one.
  if (target.port !== "") throw urlUnreachable()

  const hostname = target.hostname.replace(/^\[|\]$/g, "")

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw urlUnreachable()
    return
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw urlUnreachable()
  }

  if (addresses.length === 0) throw urlUnreachable()
  if (addresses.some((entry) => isPrivateAddress(entry.address))) throw urlUnreachable()
}

// Redirects are followed by hand so each hop can be re-checked. The chain is
// short because a document that needs four redirects to be served is not the
// case this endpoint exists for.
async function fetchDocumentUrl(start: URL): Promise<{ response: Response; finalUrl: URL }> {
  let current = start

  for (let hop = 0; hop <= MAX_URL_REDIRECTS; hop++) {
    await assertPubliclyRoutable(current)

    let response: Response
    try {
      response = await fetch(current, {
        redirect: "manual",
        headers: { accept: "*/*" },
        signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS),
      })
    } catch {
      throw urlUnreachable()
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      await response.body?.cancel().catch(() => undefined)

      if (!location || hop === MAX_URL_REDIRECTS) throw urlUnreachable()

      try {
        current = new URL(location, current)
      } catch {
        throw urlUnreachable()
      }
      continue
    }

    if (!response.ok) throw urlUnreachable()

    return { response, finalUrl: current }
  }

  throw urlUnreachable()
}

async function documentFromUrl(rawUrl: unknown): Promise<ParsedDocument> {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new RequestError('Send a "url" string in the JSON body.', 400, "missing_url")
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    throw new RequestError("That is not a valid URL.", 400, "invalid_url")
  }

  const { response, finalUrl } = await fetchDocumentUrl(parsed)

  const buffer = await readCapped(response)
  if (buffer.length === 0) {
    throw new RequestError("That URL returned an empty document.", 400, "empty_document")
  }

  // The name comes from wherever the bytes finally came from, which is what a
  // redirect to a storage bucket makes meaningful.
  const fileName = decodeURIComponent(finalUrl.pathname.split("/").pop() ?? "") || null

  return {
    buffer,
    contentType: resolveContentType(response.headers.get("content-type"), fileName, buffer),
    fileName,
  }
}

async function parseDocument(request: NextRequest): Promise<ParsedDocument> {
  const mediaType = normalizeMediaType(request.headers.get("content-type"))

  // Fail fast on an oversized upload rather than buffering it first. The header
  // can lie, so the real check still happens on the bytes we actually read.
  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > 0) {
    assertWithinSizeLimit(declaredLength)
  }

  if (mediaType === "multipart/form-data") {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      throw new RequestError("Could not read the multipart body.", 400, "invalid_body")
    }

    const file = form.get("file")
    if (!file || typeof file === "string") {
      throw new RequestError('Attach the document as a "file" field.', 400, "missing_file")
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    assertWithinSizeLimit(buffer.length)
    if (buffer.length === 0) {
      throw new RequestError("The uploaded file is empty.", 400, "empty_document")
    }

    const fileName = "name" in file && file.name ? file.name : null

    return {
      buffer,
      contentType: resolveContentType(file.type, fileName, buffer),
      fileName,
    }
  }

  if (mediaType === "application/json") {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new RequestError("Could not parse the JSON body.", 400, "invalid_body")
    }
    return documentFromUrl((body as { url?: unknown } | null)?.url)
  }

  // Anything else is treated as the raw document. The Content-Type header is
  // the caller's declaration, but the sniffer still gets the final word.
  const buffer = Buffer.from(await request.arrayBuffer())
  assertWithinSizeLimit(buffer.length)
  if (buffer.length === 0) {
    throw new RequestError(
      'Send a document: multipart/form-data with a "file" field, a raw body with its Content-Type, or JSON {"url": "..."}.',
      400,
      "empty_document",
    )
  }

  return {
    buffer,
    contentType: resolveContentType(mediaType, null, buffer),
    fileName: null,
  }
}

interface UsageRow {
  userId: string
  apiKeyId: string | null
  pages: number
  status: "succeeded" | "failed"
  fileName: string | null
  fileBytes: number | null
  durationMs: number
  error?: string | null
}

// Usage logging is best effort. The caller has already been charged (or has
// already failed), and losing the audit row is a smaller problem than turning a
// completed analysis into a 500.
async function logUsage(admin: SupabaseClient, row: UsageRow): Promise<void> {
  try {
    const { error } = await admin.from("ocr_usage").insert({
      user_id: row.userId,
      api_key_id: row.apiKeyId,
      pages: row.pages,
      status: row.status,
      model: "prebuilt-read",
      file_name: row.fileName,
      file_bytes: row.fileBytes,
      duration_ms: row.durationMs,
      error: row.error ?? null,
    })
    if (error) console.error("[ocr] Failed to record usage:", error)
  } catch (error) {
    console.error("[ocr] Failed to record usage:", error)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const receivedAt = Date.now()

  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error("[ocr] Admin client unavailable:", error)
    return errorResponse("OCR is not configured on this deployment.", 500, "server_misconfigured")
  }

  const auth = await authenticateApiKey(admin, request.headers.get("authorization"))
  if (!auth) {
    return errorResponse(
      "Invalid or missing API key. Send it as an Authorization: Bearer header.",
      401,
      "invalid_api_key",
    )
  }

  const rate = checkRateLimit(auth.keyId)
  if (!rate.ok) {
    // Deliberately not written to ocr_usage: a client stuck in a retry loop
    // would turn its own throttling into a flood of database writes.
    return errorResponse(
      `Rate limit exceeded. This key may make ${RATE_LIMIT_MAX} requests per minute.`,
      429,
      "rate_limited",
      { "Retry-After": String(rate.retryAfterSeconds) },
    )
  }

  let document: ParsedDocument
  try {
    document = await parseDocument(request)
  } catch (error) {
    const failure =
      error instanceof RequestError
        ? error
        : new RequestError("Could not read the request body.", 400, "invalid_body")

    await logUsage(admin, {
      userId: auth.userId,
      apiKeyId: auth.keyId,
      pages: 0,
      status: "failed",
      fileName: null,
      fileBytes: null,
      durationMs: Date.now() - receivedAt,
      error: failure.message,
    })

    return errorResponse(failure.message, failure.status, failure.code)
  }

  let balance
  try {
    balance = await getBalance(admin, auth.userId)
  } catch (error) {
    console.error("[ocr] Balance read failed:", error)
    return errorResponse("Could not read your page balance.", 500, "accounting_failed")
  }

  // One page is the smallest thing this endpoint can bill for, so an empty
  // balance is turned away before Azure is ever asked to do work we could not
  // charge for.
  if (balance.pagesBalance < 1) {
    await logUsage(admin, {
      userId: auth.userId,
      apiKeyId: auth.keyId,
      pages: 0,
      status: "failed",
      fileName: document.fileName,
      fileBytes: document.buffer.length,
      durationMs: Date.now() - receivedAt,
      error: "Insufficient page balance",
    })

    return errorResponse(
      "You have no pages left. Buy a page pack to continue.",
      402,
      "insufficient_pages",
    )
  }

  // The debit happens after Azure rather than before because the page count is
  // simply not knowable until the document has been analysed. Pre-charging a
  // flat page would overbill every single-page image and underbill every long
  // PDF, and pre-authorising the whole balance and refunding the difference
  // would mean a crashed request leaves a user locked out of pages they still
  // own. Analysing first costs us the Azure call in the rare case where the
  // balance is drained concurrently, which is the cheaper mistake.
  let result
  try {
    result = await runOcr({ buffer: document.buffer, contentType: document.contentType })
  } catch (error) {
    const failure =
      error instanceof OcrError
        ? error
        : new OcrError("OCR failed unexpectedly.", 502, "ocr_failed")

    if (!(error instanceof OcrError)) console.error("[ocr] Unexpected failure:", error)

    await logUsage(admin, {
      userId: auth.userId,
      apiKeyId: auth.keyId,
      pages: 0,
      status: "failed",
      fileName: document.fileName,
      fileBytes: document.buffer.length,
      durationMs: Date.now() - receivedAt,
      error: failure.message,
    })

    return errorResponse(failure.message, failure.status, failure.code)
  }

  // The whole document is debited or none of it is. Capping the debit at
  // whatever was left and returning the text anyway meant a caller who drove
  // their balance down to one page could send a thousand-page PDF and be handed
  // every page of it for a single credit, repeatable on every top-up. The RPC
  // refuses to overdraw, so a short balance surfaces here as an
  // InsufficientPagesError and the caller gets a 402 telling them exactly how
  // many pages the document needed.
  let pagesCharged: number
  let pagesRemaining: number
  try {
    pagesRemaining = await consumePages(admin, auth.userId, result.pageCount)
    pagesCharged = result.pageCount
  } catch (error) {
    if (error instanceof InsufficientPagesError) {
      const current = await getBalance(admin, auth.userId).catch(() => balance)

      await logUsage(admin, {
        userId: auth.userId,
        apiKeyId: auth.keyId,
        pages: 0,
        status: "failed",
        fileName: document.fileName,
        fileBytes: document.buffer.length,
        durationMs: Date.now() - receivedAt,
        error: `Insufficient page balance for ${result.pageCount} page(s)`,
      })

      return jsonResponse(
        {
          error: `This document is ${result.pageCount} page(s) and your balance is ${current.pagesBalance}. Nothing was charged.`,
          code: "insufficient_pages",
          pageCount: result.pageCount,
          pagesRemaining: current.pagesBalance,
        },
        402,
      )
    }

    // Accounting is broken rather than merely short. Serving the text anyway
    // would mean handing out unmetered OCR for as long as the outage lasts,
    // which on a prepaid product is the one failure worth refusing.
    console.error("[ocr] Charge failed:", error)

    await logUsage(admin, {
      userId: auth.userId,
      apiKeyId: auth.keyId,
      pages: 0,
      status: "failed",
      fileName: document.fileName,
      fileBytes: document.buffer.length,
      durationMs: Date.now() - receivedAt,
      error: "Page accounting failed",
    })

    return errorResponse("Could not record page usage. Nothing was charged.", 500, "accounting_failed")
  }

  await logUsage(admin, {
    userId: auth.userId,
    apiKeyId: auth.keyId,
    pages: pagesCharged,
    status: "succeeded",
    fileName: document.fileName,
    fileBytes: document.buffer.length,
    durationMs: Date.now() - receivedAt,
  })

  return jsonResponse({
    content: result.content,
    pageCount: result.pageCount,
    pages: result.pages,
    pagesCharged,
    pagesRemaining,
    // The analysis time, not the whole round trip. It is the number a caller
    // can act on, since the rest is their own upload.
    durationMs: result.durationMs,
  })
}
