"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, Copy } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/**
 * The single source of truth for how the OCR API is documented in the product.
 * The dashboard renders it behind the login and the public /ocr-api page renders
 * it in front of one, so there is exactly one place to edit when the endpoint
 * changes and no chance of the two drifting apart.
 *
 * Every colour here comes from the shared CSS variables rather than a literal
 * hex, which is what lets the same markup sit on two surfaces with different
 * palettes: :root carries the marketing site's black-and-green and .app-shell
 * overrides it with the product's. The one exception is body prose, which uses
 * an alpha of --foreground instead of --muted-foreground, because the root
 * muted grey is far too dim to read a page of documentation in.
 */

type ReferenceLayout = "compact" | "wide"

interface OcrApiReferenceProps {
  /** Origin the examples should call, without a trailing slash. */
  origin: string
  /**
   * "compact" is the dashboard density; "wide" gives the public page the larger
   * type and padding it needs at full marketing-page width.
   */
  layout?: ReferenceLayout
  /**
   * Where "get a key" should send the reader. The dashboard can link straight
   * at the key manager; the public page has to send them through signup first.
   */
  keysHref?: string
}

const SUPPORTED_TYPES = [
  { type: "application/pdf", note: "PDF, including multi-page scans" },
  { type: "image/jpeg", note: "JPEG photos and scans" },
  { type: "image/png", note: "PNG screenshots and exports" },
  { type: "image/tiff", note: "TIFF, including multi-page faxes" },
  { type: "image/bmp", note: "Windows bitmap" },
  { type: "image/heif", note: "HEIF/HEIC from modern phones" },
]

const ERROR_CODES = [
  {
    status: "400",
    code: "invalid_body",
    meaning: "The body could not be parsed as the Content-Type promised.",
  },
  {
    status: "400",
    code: "missing_file",
    meaning: "A multipart request arrived without a \"file\" field.",
  },
  {
    status: "400",
    code: "missing_url",
    meaning: "A JSON request arrived without a \"url\" string.",
  },
  {
    status: "400",
    code: "invalid_url",
    meaning: "The url was unparseable or used a scheme other than http/https.",
  },
  {
    status: "400",
    code: "url_fetch_failed",
    meaning: "The document could not be downloaded from the url you gave.",
  },
  {
    status: "400",
    code: "empty_document",
    meaning: "The request carried no bytes, or the url returned an empty body.",
  },
  {
    status: "401",
    code: "invalid_api_key",
    meaning: "Missing, malformed, unknown or revoked key. All four look the same on purpose.",
  },
  {
    status: "402",
    code: "insufficient_pages",
    meaning:
      "Your balance is empty, or smaller than this document. Buy a page pack and retry; nothing was charged.",
  },
  {
    status: "413",
    code: "document_too_large",
    meaning: "The document is over the 50MB limit.",
  },
  {
    status: "415",
    code: "unsupported_media_type",
    meaning: "The bytes are not one of the supported document types.",
  },
  {
    status: "429",
    code: "rate_limited",
    meaning: "More than 20 requests in a minute on this key. Honour the Retry-After header.",
  },
  {
    status: "500",
    code: "accounting_failed",
    meaning: "Page accounting failed, so the text is withheld. Nothing was charged.",
  },
  {
    status: "502",
    code: "ocr_failed",
    meaning: "The upstream OCR engine rejected or failed on the document. Nothing was charged.",
  },
]

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success(label ? `${label} copied` : "Copied to clipboard")
      // Long enough to register as feedback, short enough that the button is
      // back to its normal affordance before anyone tries to copy again.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.")
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-black/40">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copy code"
        className="absolute right-2 top-2 z-10 rounded-md border border-border bg-background/80 p-1.5 text-foreground/60 transition-colors hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto p-4 pr-12 font-mono text-[13px] leading-relaxed text-foreground/85">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Section({
  id,
  title,
  children,
  layout,
}: {
  id: string
  title: string
  children: React.ReactNode
  layout: ReferenceLayout
}) {
  const wide = layout === "wide"
  return (
    <section
      id={id}
      className={cn("rounded-xl border border-border bg-card", wide ? "p-6 md:p-8" : "p-5 md:p-6")}
    >
      <h2
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          wide ? "text-xl md:text-2xl" : "text-lg",
        )}
      >
        {title}
      </h2>
      <div className={cn("space-y-4", wide ? "mt-5" : "mt-4")}>{children}</div>
    </section>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-7 text-foreground/70">{children}</p>
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-foreground/90">
      {children}
    </code>
  )
}

export function OcrApiReference({
  origin,
  layout = "compact",
  keysHref = "/dashboard/api-keys",
}: OcrApiReferenceProps) {
  const base = origin.replace(/\/+$/, "")
  const wide = layout === "wide"

  const curlMultipart = `curl -X POST ${base}/api/v1/ocr \\
  -H "Authorization: Bearer $TOOLS_API_KEY" \\
  -F "file=@invoice.pdf"`

  const curlRaw = `curl -X POST ${base}/api/v1/ocr \\
  -H "Authorization: Bearer $TOOLS_API_KEY" \\
  -H "Content-Type: application/pdf" \\
  --data-binary @invoice.pdf`

  const curlUrl = `curl -X POST ${base}/api/v1/ocr \\
  -H "Authorization: Bearer $TOOLS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/invoice.pdf"}'`

  const responseJson = `{
  "content": "INVOICE\\nAcme Corp\\nInvoice #1042\\n...",
  "pageCount": 3,
  "pages": [
    { "pageNumber": 1, "text": "INVOICE\\nAcme Corp\\n..." },
    { "pageNumber": 2, "text": "Line items\\n..." },
    { "pageNumber": 3, "text": "Total due\\n..." }
  ],
  "pagesCharged": 3,
  "pagesRemaining": 2497,
  "durationMs": 4120
}`

  const errorJson = `{
  "error": "This document is 12 page(s) and your balance is 4. Nothing was charged.",
  "code": "insufficient_pages",
  "pageCount": 12,
  "pagesRemaining": 4
}`

  const accountExample = `curl ${base}/api/v1/account \\
  -H "Authorization: Bearer $TOOLS_API_KEY"

{ "pagesBalance": 2497, "pagesUsedTotal": 503 }`

  const jsExample = `import { readFile } from "node:fs/promises"

const form = new FormData()
form.append(
  "file",
  new Blob([await readFile("invoice.pdf")], { type: "application/pdf" }),
  "invoice.pdf",
)

const res = await fetch("${base}/api/v1/ocr", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.TOOLS_API_KEY}\` },
  body: form,
})

if (!res.ok) {
  const { error, code } = await res.json()
  throw new Error(\`\${code}: \${error}\`)
}

const { content, pageCount, pagesRemaining } = await res.json()
console.log(\`\${pageCount} pages read, \${pagesRemaining} left\`)
console.log(content)`

  const pythonExample = `import os
import requests

with open("invoice.pdf", "rb") as f:
    res = requests.post(
        "${base}/api/v1/ocr",
        headers={"Authorization": f"Bearer {os.environ['TOOLS_API_KEY']}"},
        files={"file": ("invoice.pdf", f, "application/pdf")},
        # A long scan can keep the OCR engine busy for minutes.
        timeout=300,
    )

if res.status_code != 200:
    body = res.json()
    raise RuntimeError(f"{body['code']}: {body['error']}")

data = res.json()
print(f"{data['pageCount']} pages read, {data['pagesRemaining']} left")
print(data["content"])`

  return (
    <div className={cn(wide ? "space-y-6" : "space-y-5")}>
      <Section id="overview" title="Overview" layout={layout}>
        <Prose>
          One endpoint takes a PDF or an image and returns its text, both as a single string and
          split page by page. There is no upload UI and no SDK to install: everything below is a
          plain HTTP request you can make from any language.
        </Prose>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <th scope="row" className="w-40 px-4 py-3 font-medium text-foreground/70">
                  Base URL
                </th>
                <td className="px-4 py-3 font-mono text-[13px] text-foreground">{base}</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-medium text-foreground/70">
                  Read a document
                </th>
                <td className="px-4 py-3 font-mono text-[13px] text-foreground">
                  <span className="text-primary">POST</span> /api/v1/ocr
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-medium text-foreground/70">
                  Check your balance
                </th>
                <td className="px-4 py-3 font-mono text-[13px] text-foreground">
                  <span className="text-primary">GET</span> /api/v1/account
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-medium text-foreground/70">
                  Model
                </th>
                <td className="px-4 py-3 font-mono text-[13px] text-foreground">prebuilt-read</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="authentication" title="Authentication" layout={layout}>
        <Prose>
          Every request carries an API key as a Bearer token. Keys start with{" "}
          <Mono>tk_live_</Mono> and are shown in full exactly once, when you create them.{" "}
          <Link href={keysHref} className="text-primary underline-offset-4 hover:underline">
            Create a key
          </Link>{" "}
          and store it the way you store any other secret.
        </Prose>
        <CodeBlock label="Header" code={`Authorization: Bearer tk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} />
        <Prose>
          Keys are stored only as a SHA-256 digest, so a lost key cannot be recovered — revoke it
          and issue another. Cross-origin requests are allowed because the credential is a header
          you attach deliberately rather than a cookie the browser attaches for you, but that is
          not an invitation to ship a key to a browser: anything in front of a user should call
          your own backend, which then calls this API.
        </Prose>
      </Section>

      <Section id="requests" title="Sending a document" layout={layout}>
        <Prose>
          Three request shapes, all of them <Mono>POST /api/v1/ocr</Mono>. Pick whichever fits the
          language you are calling from; they produce identical responses. The content type you
          declare is only a hint — the bytes themselves decide how the document is treated, so a
          file that arrives as <Mono>application/octet-stream</Mono> still works.
        </Prose>
        <Tabs defaultValue="multipart">
          <TabsList>
            <TabsTrigger value="multipart">Multipart</TabsTrigger>
            <TabsTrigger value="raw">Raw body</TabsTrigger>
            <TabsTrigger value="url">JSON url</TabsTrigger>
          </TabsList>
          <TabsContent value="multipart" className="mt-4 space-y-3">
            <Prose>
              Send <Mono>multipart/form-data</Mono> with the document in a field named{" "}
              <Mono>file</Mono>. This is the shape almost every HTTP client makes easiest.
            </Prose>
            <CodeBlock label="Multipart example" code={curlMultipart} />
          </TabsContent>
          <TabsContent value="raw" className="mt-4 space-y-3">
            <Prose>
              Send the file as the entire request body with its own{" "}
              <Mono>Content-Type</Mono>. Nothing is copied into a form envelope, which makes this
              the cheapest option for large files.
            </Prose>
            <CodeBlock label="Raw body example" code={curlRaw} />
          </TabsContent>
          <TabsContent value="url" className="mt-4 space-y-3">
            <Prose>
              Send <Mono>application/json</Mono> with a <Mono>url</Mono> and the document is
              downloaded for you. The URL has to be publicly reachable over <Mono>http</Mono> or{" "}
              <Mono>https</Mono> on its default port — private and link-local addresses are
              refused, at the first hop and at every redirect — the download times out after 30
              seconds, and the same 50MB limit applies to whatever comes back.
            </Prose>
            <CodeBlock label="JSON url example" code={curlUrl} />
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="documents" title="Documents it accepts" layout={layout}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium text-foreground/70">Content type</th>
                <th className="px-4 py-3 font-medium text-foreground/70">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SUPPORTED_TYPES.map((row) => (
                <tr key={row.type}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-foreground">
                    {row.type}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Prose>
          Common aliases are normalised for you, so <Mono>image/jpg</Mono> and{" "}
          <Mono>image/heic</Mono> are fine. Anything else is refused with a{" "}
          <Mono>415</Mono> before the bytes leave our network. The hard ceiling is{" "}
          <strong className="font-semibold text-foreground">50MB</strong> per document, checked
          both against the declared length and against the bytes actually read.
        </Prose>
      </Section>

      <Section id="response" title="The response" layout={layout}>
        <Prose>
          A successful call returns <Mono>200</Mono> and the JSON below. <Mono>content</Mono> is
          the whole document as one string with page breaks preserved as newlines;{" "}
          <Mono>pages</Mono> is the same text split into one entry per page, which is what you
          want if you are indexing or chunking.
        </Prose>
        <CodeBlock label="Response" code={responseJson} />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <th scope="row" className="w-44 px-4 py-3 font-mono text-[13px] text-foreground">
                  content
                </th>
                <td className="px-4 py-3 text-foreground/70">Full extracted text, all pages.</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-mono text-[13px] text-foreground">
                  pageCount
                </th>
                <td className="px-4 py-3 text-foreground/70">Pages the document actually had.</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-mono text-[13px] text-foreground">
                  pages[]
                </th>
                <td className="px-4 py-3 text-foreground/70">
                  <Mono>pageNumber</Mono> (1-based) and <Mono>text</Mono> for each page.
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-mono text-[13px] text-foreground">
                  pagesCharged
                </th>
                <td className="px-4 py-3 text-foreground/70">
                  Pages debited from your balance for this call.
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-mono text-[13px] text-foreground">
                  pagesRemaining
                </th>
                <td className="px-4 py-3 text-foreground/70">Balance left after the debit.</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-mono text-[13px] text-foreground">
                  durationMs
                </th>
                <td className="px-4 py-3 text-foreground/70">
                  Time the OCR itself took, not your upload.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="billing" title="How pages are counted and billed" layout={layout}>
        <Prose>
          Billing is prepaid pages, one page per page read. A ten-page PDF costs ten pages; a
          single photo costs one. Pages are bought in packs, never expire, and there is no
          subscription — when a balance runs out you buy another pack.
        </Prose>
        <Prose>
          Only successful reads are charged. A <Mono>401</Mono>, <Mono>413</Mono>,{" "}
          <Mono>415</Mono>, <Mono>429</Mono> or <Mono>502</Mono> costs you nothing, and neither
          does a <Mono>402</Mono>. A document is billed whole or not at all: if it has more pages
          than your balance the call returns <Mono>402</Mono> with the <Mono>pageCount</Mono> it
          would have cost and your <Mono>pagesRemaining</Mono>, nothing is debited, and no text is
          returned. Buy a pack and send it again.
        </Prose>
        <Prose>
          To check a balance without spending a page, call the account endpoint. Doing that before
          a batch job is the cheapest way to avoid discovering an empty balance halfway through
          one.
        </Prose>
        <CodeBlock label="Account example" code={accountExample} />
      </Section>

      <Section id="limits" title="Rate limits" layout={layout}>
        <Prose>
          Each API key may make{" "}
          <strong className="font-semibold text-foreground">20 requests per minute</strong>. Going
          over returns <Mono>429</Mono> with a <Mono>Retry-After</Mono> header in seconds; wait
          that long rather than retrying immediately. The limit is per key, so splitting a
          workload across several keys raises your effective throughput. Long documents are the
          other limit worth knowing about: a request may run for up to five minutes, so set your
          client timeout accordingly rather than leaving it at the usual 30 seconds.
        </Prose>
      </Section>

      <Section id="errors" title="Errors" layout={layout}>
        <Prose>
          Every failure returns JSON with a human-readable <Mono>error</Mono> and a stable{" "}
          <Mono>code</Mono>. Branch on the code, not on the message text.
        </Prose>
        <CodeBlock label="Error shape" code={errorJson} />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium text-foreground/70">Status</th>
                <th className="px-4 py-3 font-medium text-foreground/70">Code</th>
                <th className="px-4 py-3 font-medium text-foreground/70">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ERROR_CODES.map((row) => (
                <tr key={row.code}>
                  <td className="px-4 py-3 font-mono text-[13px] tabular-nums text-foreground">
                    {row.status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-primary">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="examples" title="Copy-paste examples" layout={layout}>
        <Prose>
          All three read a local PDF and print its text. Keep the key in an environment variable —
          the examples assume <Mono>TOOLS_API_KEY</Mono>.
        </Prose>
        <Tabs defaultValue="curl">
          <TabsList>
            <TabsTrigger value="curl">curl</TabsTrigger>
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
          </TabsList>
          <TabsContent value="curl" className="mt-4">
            <CodeBlock label="curl example" code={curlMultipart} />
          </TabsContent>
          <TabsContent value="javascript" className="mt-4">
            <CodeBlock label="JavaScript example" code={jsExample} />
          </TabsContent>
          <TabsContent value="python" className="mt-4">
            <CodeBlock label="Python example" code={pythonExample} />
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  )
}
