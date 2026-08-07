// Azure AI Document Intelligence, spoken to over plain REST. The official SDK
// would add a sizeable dependency tree for what is one POST and a polling loop,
// and the polling behaviour has to be tuned against our own request budget
// anyway, so there is nothing left for the SDK to do for us.
import "server-only"

const MODEL_ID = "prebuilt-read"
const DEFAULT_API_VERSION = "2024-11-30"

// Whole-analysis budget, submit and polling combined. The route runs with a
// maxDuration of 300s, so this leaves room for the response to be serialised
// and the usage row to be written after Azure finally answers. It is set close
// to that ceiling on purpose: a several-hundred-page scan keeps Azure busy for
// minutes, and giving up early does not stop Azure billing us for every page it
// already read, it only guarantees the customer gets nothing for them.
const DEFAULT_TIMEOUT_MS = 240_000

// Individual HTTP calls get their own shorter ceilings so one hung socket
// cannot silently consume the entire budget.
const SUBMIT_TIMEOUT_MS = 60_000
const POLL_TIMEOUT_MS = 30_000

// Polling backoff: start at a second, grow by half each round, never wait more
// than five. Azure gives no hint about how long an analysis will take, and this
// schedule keeps a one-page image fast while not hammering a fifty-page PDF.
const POLL_INITIAL_DELAY_MS = 1_000
const POLL_BACKOFF_FACTOR = 1.5
const POLL_MAX_DELAY_MS = 5_000

export class OcrError extends Error {
  // HTTP status the public API should answer with, already translated from
  // whatever Azure said, so route handlers never have to interpret Azure's
  // status codes themselves.
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = "OcrError"
    this.status = status
    this.code = code
  }
}

export interface OcrPage {
  pageNumber: number
  text: string
}

export interface OcrResult {
  content: string
  pageCount: number
  pages: OcrPage[]
  durationMs: number
}

export interface RunOcrOptions {
  buffer: Buffer
  contentType: string
  timeoutMs?: number
}

interface AzureSpan {
  offset?: number
  length?: number
}

interface AzureLine {
  content?: string
}

interface AzurePage {
  pageNumber?: number
  spans?: AzureSpan[]
  lines?: AzureLine[]
}

interface AzureAnalyzeResult {
  content?: string
  pages?: AzurePage[]
}

interface AzureOperation {
  status?: string
  analyzeResult?: AzureAnalyzeResult
  error?: { code?: string; message?: string }
}

interface AzureConfig {
  endpoint: string
  key: string
  apiVersion: string
}

function readConfig(): AzureConfig {
  const endpoint = process.env.AZURE_DOCINTEL_ENDPOINT?.trim()
  const key = process.env.AZURE_DOCINTEL_KEY?.trim()

  if (!endpoint || !key) {
    throw new OcrError(
      "OCR is not configured on this deployment.",
      500,
      "azure_not_configured",
    )
  }

  return {
    // The request paths below are concatenated straight onto this, so the
    // endpoint must carry no trailing slash or Azure answers the resulting
    // double slash with a 404. Strip it here rather than expecting whoever
    // pastes the value out of the Azure portal to notice.
    endpoint: endpoint.replace(/\/+$/, ""),
    key,
    apiVersion: process.env.AZURE_DOCINTEL_API_VERSION?.trim() || DEFAULT_API_VERSION,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Azure error bodies are {error: {code, message}}, but a gateway failure in
// front of the service returns HTML or nothing at all, so this never assumes
// it got JSON.
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return ""
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string }
      return parsed.error?.message ?? parsed.message ?? text.slice(0, 300)
    } catch {
      return text.slice(0, 300)
    }
  } catch {
    return ""
  }
}

// Translate an Azure HTTP failure into the status our own callers should see.
// The distinction that matters is whose fault it is: a bad document is the
// caller's problem and gets a 4xx, whereas a rejected subscription key is our
// misconfiguration and must not be reported as if the caller's API key were
// bad.
function mapHttpError(status: number, detail: string, fallbackCode: string): OcrError {
  const suffix = detail ? ` ${detail}` : ""

  if (status === 400) {
    return new OcrError(
      `Azure could not read this document.${suffix}`,
      400,
      "azure_invalid_document",
    )
  }
  if (status === 401 || status === 403) {
    return new OcrError(
      "OCR is misconfigured on this deployment.",
      500,
      "azure_auth_failed",
    )
  }
  if (status === 404) {
    return new OcrError(
      "OCR is misconfigured on this deployment.",
      500,
      "azure_not_configured",
    )
  }
  if (status === 413) {
    return new OcrError("Document is too large for OCR.", 413, "azure_document_too_large")
  }
  if (status === 415) {
    return new OcrError(
      `Azure does not support this file type.${suffix}`,
      415,
      "azure_unsupported_media",
    )
  }
  if (status === 429) {
    return new OcrError(
      "OCR is busy right now. Retry in a moment.",
      429,
      "azure_rate_limited",
    )
  }

  return new OcrError(`OCR provider error (${status}).${suffix}`, 502, fallbackCode)
}

async function submitAnalysis(
  config: AzureConfig,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const url =
    `${config.endpoint}/documentintelligence/documentModels/${MODEL_ID}:analyze` +
    `?api-version=${encodeURIComponent(config.apiVersion)}` +
    // We rebuild each page's text by slicing analyzeResult.content with the
    // span offsets, and JavaScript string indices are UTF-16 code units. The
    // API's default indexing counts grapheme clusters, which silently
    // misaligns every page after the first emoji or combining accent.
    `&stringIndexType=utf16CodeUnit`

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": config.key,
        "Content-Type": contentType,
      },
      // A zero-copy view over the same memory; passing the Buffer through
      // would work too, but this keeps the BodyInit type unambiguous.
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    })
  } catch {
    throw new OcrError(
      "Could not reach the OCR provider.",
      502,
      "azure_unreachable",
    )
  }

  if (!response.ok) {
    throw mapHttpError(response.status, await readErrorDetail(response), "azure_submit_failed")
  }

  // The 202 carries the polling URL in a response header, not in the body,
  // which is empty on success.
  const operationLocation = response.headers.get("operation-location")
  if (!operationLocation) {
    throw new OcrError(
      "OCR provider did not return an operation location.",
      502,
      "azure_missing_operation_location",
    )
  }

  return operationLocation
}

// Azure answers a throttled poll with the number of seconds it wants us to wait.
// Ignoring it means polling into the throttle again and being pushed back
// further, so it wins over our own backoff whenever it is present and sane.
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after")
  if (!header) return null

  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 60) * 1000

  const at = Date.parse(header)
  if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 0), 60_000)

  return null
}

async function pollAnalysis(
  config: AzureConfig,
  operationLocation: string,
  deadline: number,
): Promise<AzureAnalyzeResult> {
  let delay = POLL_INITIAL_DELAY_MS

  for (;;) {
    if (Date.now() >= deadline) {
      throw new OcrError("OCR timed out waiting for the provider.", 504, "azure_timeout")
    }

    let response: Response
    try {
      response = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": config.key },
        signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
      })
    } catch {
      throw new OcrError("Lost contact with the OCR provider.", 502, "azure_unreachable")
    }

    let throttledForMs: number | null = null

    if (response.status === 429) {
      // Azure throttles the polling endpoint as well when the resource is
      // under load. That is not a failed analysis, so widen the backoff and
      // keep waiting rather than abandoning a document that is still being
      // processed and has already been paid for on Azure's side.
      throttledForMs = retryAfterMs(response)
      await response.text().catch(() => "")
    } else if (!response.ok) {
      throw mapHttpError(response.status, await readErrorDetail(response), "azure_poll_failed")
    } else {
      let operation: AzureOperation
      try {
        operation = (await response.json()) as AzureOperation
      } catch {
        throw new OcrError(
          "OCR provider returned an unreadable response.",
          502,
          "azure_poll_failed",
        )
      }

      const status = operation.status?.toLowerCase()

      if (status === "succeeded") {
        if (!operation.analyzeResult) {
          throw new OcrError(
            "OCR provider reported success with no result.",
            502,
            "azure_empty_result",
          )
        }
        return operation.analyzeResult
      }

      if (status === "failed") {
        const message = operation.error?.message ?? "The OCR provider could not analyse this document."
        throw new OcrError(message, 502, "azure_analysis_failed")
      }
      // Anything else is "notStarted" or "running": fall through and wait.
    }

    // Never sleep past the deadline; the loop head would only wake up to
    // throw, and the caller is waiting on this request.
    const wait = Math.max(throttledForMs ?? 0, delay)
    await sleep(Math.min(wait, Math.max(0, deadline - Date.now())))
    delay = Math.min(delay * POLL_BACKOFF_FACTOR, POLL_MAX_DELAY_MS)
  }
}

// Per-page text has to be reconstructed: a page object carries words and lines
// rather than a ready-made string, but it does carry spans into the flat
// analyzeResult.content, which is the cheapest and most faithful way back to
// the page's own text.
function textForPage(content: string, page: AzurePage): string {
  const spans = page.spans ?? []
  if (spans.length > 0) {
    return spans
      .map((span) => {
        const offset = span.offset ?? 0
        const length = span.length ?? 0
        return content.slice(offset, offset + length)
      })
      .join("")
  }

  // Some model/version combinations omit spans. Lines are the next best
  // source and preserve reading order.
  const lines = page.lines ?? []
  if (lines.length > 0) {
    return lines.map((line) => line.content ?? "").join("\n")
  }

  return ""
}

export async function runOcr({
  buffer,
  contentType,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunOcrOptions): Promise<OcrResult> {
  const config = readConfig()
  const startedAt = Date.now()
  const deadline = startedAt + timeoutMs

  const operationLocation = await submitAnalysis(config, buffer, contentType)
  const analyzeResult = await pollAnalysis(config, operationLocation, deadline)

  const content = analyzeResult.content ?? ""
  const azurePages = analyzeResult.pages ?? []

  // Billing reads pageCount, so a successful analysis must never come back as
  // zero pages: that would hand out free OCR whenever Azure changes the shape
  // of a response. One page is the honest floor for a document Azure agreed to
  // analyse.
  const pageCount = azurePages.length > 0 ? azurePages.length : 1

  const pages: OcrPage[] =
    azurePages.length > 0
      ? azurePages.map((page, index) => ({
          pageNumber: page.pageNumber ?? index + 1,
          text: textForPage(content, page),
        }))
      : [{ pageNumber: 1, text: content }]

  return {
    content,
    pageCount,
    pages,
    durationMs: Date.now() - startedAt,
  }
}
