# OCR API

Extract text from PDFs, scans and photos over a single HTTP endpoint. Billing is
prepaid pages: one page of a document costs one page of your balance. There is
no subscription and pages never expire.

This document mirrors `components/docs/ocr-api-reference.tsx`, which is what the
dashboard and the public `/ocr-api` page render. Change one and change the other.

- Base URL: `https://404tools.dev`
- Read a document: `POST /api/v1/ocr`
- Check your balance: `GET /api/v1/account`
- Model: `prebuilt-read`

## Authentication

Every request carries an API key as a Bearer token:

```
Authorization: Bearer tk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keys start with `tk_live_` and are created at `/dashboard/api-keys`. The
plaintext key is shown exactly once, at creation — only its SHA-256 digest is
stored, so a lost key cannot be recovered and has to be revoked and replaced.

Cross-origin requests are allowed, because the credential is a header you attach
deliberately rather than a cookie the browser attaches for you. That is not an
invitation to ship a key to a browser: anything in front of a user should call
your own backend, which then calls this API.

## Sending a document

Three request shapes, all of them `POST /api/v1/ocr`, all returning the same
response. The content type you declare is only a hint — the bytes themselves
decide how the document is treated, so a file that arrives as
`application/octet-stream` still works.

### Multipart

Send `multipart/form-data` with the document in a field named `file`.

```bash
curl -X POST https://404tools.dev/api/v1/ocr \
  -H "Authorization: Bearer $TOOLS_API_KEY" \
  -F "file=@invoice.pdf"
```

### Raw body

Send the file as the entire request body with its own `Content-Type`. Nothing is
copied into a form envelope, which makes this the cheapest option for large
files.

```bash
curl -X POST https://404tools.dev/api/v1/ocr \
  -H "Authorization: Bearer $TOOLS_API_KEY" \
  -H "Content-Type: application/pdf" \
  --data-binary @invoice.pdf
```

### JSON url

Send `application/json` with a `url` and the document is downloaded for you.
Only `http` and `https` are accepted, the download times out after 30 seconds,
and the same 50MB limit applies to whatever comes back.

```bash
curl -X POST https://404tools.dev/api/v1/ocr \
  -H "Authorization: Bearer $TOOLS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/invoice.pdf"}'
```

## Documents it accepts

| Content type      | Notes                                |
| ----------------- | ------------------------------------ |
| `application/pdf` | PDF, including multi-page scans      |
| `image/jpeg`      | JPEG photos and scans                |
| `image/png`       | PNG screenshots and exports          |
| `image/tiff`      | TIFF, including multi-page faxes     |
| `image/bmp`       | Windows bitmap                       |
| `image/heif`      | HEIF/HEIC from modern phones         |

Common aliases are normalised for you, so `image/jpg` and `image/heic` are fine.
Anything else is refused with a `415` before the bytes leave our network.

The hard ceiling is **50MB** per document, checked both against the declared
content length and against the bytes actually read.

## The response

A successful call returns `200` and this JSON. `content` is the whole document
as one string with page breaks preserved as newlines; `pages` is the same text
split into one entry per page, which is what you want if you are indexing or
chunking.

```json
{
  "content": "INVOICE\nAcme Corp\nInvoice #1042\n...",
  "pageCount": 3,
  "pages": [
    { "pageNumber": 1, "text": "INVOICE\nAcme Corp\n..." },
    { "pageNumber": 2, "text": "Line items\n..." },
    { "pageNumber": 3, "text": "Total due\n..." }
  ],
  "pagesCharged": 3,
  "pagesRemaining": 2497,
  "durationMs": 4120
}
```

| Field            | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| `content`        | Full extracted text, all pages                     |
| `pageCount`      | Pages the document actually had                    |
| `pages[]`        | `pageNumber` (1-based) and `text` for each page     |
| `pagesCharged`   | Pages debited from your balance for this call       |
| `pagesRemaining` | Balance left after the debit                        |
| `durationMs`     | Time the OCR itself took, not your upload           |

## How pages are counted and billed

One page per page read. A ten-page PDF costs ten pages; a single photo costs
one. Pages are bought in packs, never expire, and nothing renews.

Only successful reads are charged. A `401`, `402`, `413`, `415`, `429` or `502`
costs you nothing.

Watch `pagesCharged` rather than assuming it equals `pageCount`. If your balance
runs short partway through a long document you still get the full text back, but
the smaller `pagesCharged` is the signal that you are out of pages and the next
call will fail with `402`.

To check a balance without spending a page, call the account endpoint. Doing
that before a batch job is the cheapest way to avoid discovering an empty
balance halfway through one.

```bash
curl https://404tools.dev/api/v1/account \
  -H "Authorization: Bearer $TOOLS_API_KEY"

{ "pagesBalance": 2497, "pagesUsedTotal": 503 }
```

### Page packs

| Pack    | Pages  | Price | Per page |
| ------- | ------ | ----- | -------- |
| Starter | 2,500  | $50   | 2.0¢     |
| Growth  | 10,000 | $150  | 1.5¢     |
| Scale   | 50,000 | $500  | 1.0¢     |

The catalog itself lives in `lib/page-packs.ts` and is the source of truth.

## Rate limits

Each API key may make **20 requests per minute**. Going over returns `429` with
a `Retry-After` header in seconds; wait that long rather than retrying
immediately. The limit is per key, so splitting a workload across several keys
raises your effective throughput.

A request may run for up to five minutes on a long document, so set your client
timeout accordingly rather than leaving it at the usual 30 seconds.

## Errors

Every failure returns JSON with a human-readable `error` and a stable `code`.
Branch on the code, not on the message text.

```json
{
  "error": "You have no pages left. Buy a page pack to continue.",
  "code": "insufficient_pages"
}
```

| Status | Code                     | Meaning                                                                       |
| ------ | ------------------------ | ----------------------------------------------------------------------------- |
| 400    | `invalid_body`           | The body could not be parsed as the Content-Type promised                      |
| 400    | `missing_file`           | A multipart request arrived without a `file` field                             |
| 400    | `missing_url`            | A JSON request arrived without a `url` string                                  |
| 400    | `invalid_url`            | The url was unparseable or used a scheme other than http/https                 |
| 400    | `url_fetch_failed`       | The document could not be downloaded from the url you gave                     |
| 400    | `empty_document`         | The request carried no bytes, or the url returned an empty body                |
| 401    | `invalid_api_key`        | Missing, malformed, unknown or revoked key. All four look the same on purpose  |
| 402    | `insufficient_pages`     | Your balance is empty. Buy a page pack and retry; nothing was charged          |
| 413    | `document_too_large`     | The document is over the 50MB limit                                            |
| 415    | `unsupported_media_type` | The bytes are not one of the supported document types                          |
| 429    | `rate_limited`           | More than 20 requests in a minute on this key. Honour the `Retry-After` header |
| 500    | `accounting_failed`      | Page accounting failed, so the text is withheld. Nothing was charged           |
| 502    | `ocr_failed`             | The upstream OCR engine rejected or failed on the document. Nothing was charged |

## Examples

All three read a local PDF and print its text. Keep the key in an environment
variable — the examples assume `TOOLS_API_KEY`.

### curl

```bash
curl -X POST https://404tools.dev/api/v1/ocr \
  -H "Authorization: Bearer $TOOLS_API_KEY" \
  -F "file=@invoice.pdf"
```

### JavaScript

```js
import { readFile } from "node:fs/promises"

const form = new FormData()
form.append(
  "file",
  new Blob([await readFile("invoice.pdf")], { type: "application/pdf" }),
  "invoice.pdf",
)

const res = await fetch("https://404tools.dev/api/v1/ocr", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.TOOLS_API_KEY}` },
  body: form,
})

if (!res.ok) {
  const { error, code } = await res.json()
  throw new Error(`${code}: ${error}`)
}

const { content, pageCount, pagesRemaining } = await res.json()
console.log(`${pageCount} pages read, ${pagesRemaining} left`)
console.log(content)
```

### Python

```python
import os
import requests

with open("invoice.pdf", "rb") as f:
    res = requests.post(
        "https://404tools.dev/api/v1/ocr",
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
print(data["content"])
```
