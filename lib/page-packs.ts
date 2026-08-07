// Prepaid OCR page packs purchasable via Paddle. Client-safe (no "server-only")
// so the checkout API, the webhook and the billing page all render the same
// catalog. There are no subscriptions anywhere in this product: a pack is a
// one-time transaction that tops up pages_balance, and pages never expire.
//
// The unit economics: Azure AI Document Intelligence bills prebuilt-read at
// roughly $1.50 per 1000 pages, so raw cost is about $0.0015 a page and every
// pack below resells at a large multiple of that — Starter at 2c a page is a bit
// over thirteen times cost, and even Scale at 1c is still nearly seven times.
//
// The page counts are chosen so the per-page rate lands on 2c, 1.5c and 1c
// exactly. That is worth more than squeezing the margin: a customer can see at a
// glance that the rate improves as the pack grows, without doing arithmetic. The
// rate must keep falling as the pack gets bigger, because buying the larger pack
// should always be the better deal and the volume it commits up front is worth
// more to us than the margin given away. Any new pack has to preserve that
// ordering or the catalog stops making sense read top to bottom.
export const PAGE_PACKS = [
  { id: "starter", name: "Starter", pages: 2500, usd: 50 },
  { id: "growth", name: "Growth", pages: 10000, usd: 150 },
  { id: "scale", name: "Scale", pages: 50000, usd: 500 },
] as const

export type PagePack = (typeof PAGE_PACKS)[number]
export type PagePackId = PagePack["id"]

export const DEFAULT_PAGE_PACK_ID: PagePackId = "growth"

export function findPagePack(id: string | null | undefined): PagePack | null {
  return PAGE_PACKS.find((pack) => pack.id === id) ?? null
}

// Cents rather than dollars because the rates are fractions of a cent apart at
// the top of the catalog, and a dollar figure would round them all to $0.01.
export function perPageCents(pack: PagePack): number {
  return (pack.usd * 100) / pack.pages
}
