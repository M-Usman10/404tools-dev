import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Github, Gauge, Lock } from "lucide-react";

import { OcrApiReference } from "@/components/docs/ocr-api-reference";
import { PAGE_PACKS, DEFAULT_PAGE_PACK_ID, perPageCents } from "@/lib/page-packs";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "OCR API — extract text from PDFs and images | 404tools.dev",
  description:
    "A single HTTP endpoint that turns PDFs, scans and photos into text, page by page. Prepaid pages from 1¢, no subscription, keys in one click.",
  alternates: { canonical: "https://404tools.dev/ocr-api" },
};

// The one paid thing on the site, so it lives on the marketing surface rather
// than behind the login and is written in the landing page's literal hex
// palette instead of the dashboard's .app-shell tokens. The shared reference
// component below is built from the CSS variables, which on this side of the
// site already resolve to exactly these colours.

const highlights = [
  {
    icon: FileText,
    title: "PDFs, scans and photos",
    body: "PDF, JPEG, PNG, TIFF, BMP and HEIF up to 50MB, multi-page or single shot.",
  },
  {
    icon: Gauge,
    title: "One request, all the text",
    body: "Get the whole document as a string and the same text split page by page.",
  },
  {
    icon: Lock,
    title: "Prepaid, never a subscription",
    body: "Buy pages once. They never expire and nothing renews on your card.",
  },
];

export default function OcrApiPage() {
  const origin = getSiteUrl();

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-lg text-[#22c55e]">[ ]</span>
            <span className="font-medium">404tools.dev</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-[#a1a1aa] transition-colors hover:text-white sm:inline"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[#22c55e] px-3 py-1.5 text-sm font-medium text-[#080808] transition-colors hover:bg-[#22c55e]/90"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
              <span>Prepaid pages</span>
              <span className="text-[#22c55e]/50">·</span>
              <span>No subscription</span>
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              OCR API for PDFs and images.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-pretty text-lg text-[#a1a1aa]">
              Post a document to one endpoint and get its text back, page by page. No upload UI, no
              SDK, no monthly bill — just a Bearer key and a balance of pages.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-[#080808] transition-colors hover:bg-[#22c55e]/90"
              >
                Get an API key
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#reference"
                className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-white"
              >
                Read the reference
              </Link>
            </div>
            <p className="mt-8 text-sm text-[#a1a1aa]">
              From {perPageCents(PAGE_PACKS[PAGE_PACKS.length - 1]).toFixed(1)}&cent; a page · Pages
              never expire
            </p>
          </div>
        </section>

        {/* What it does */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/[0.08] bg-[#111111] p-5"
                >
                  <Icon className="h-5 w-5 text-[#22c55e]" aria-hidden="true" />
                  <h2 className="mb-2 mt-4 text-base font-medium text-white">{title}</h2>
                  <p className="text-sm leading-relaxed text-[#a1a1aa]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="border-y border-white/[0.08] bg-[#0a0a0a] px-4 py-20 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-[#a1a1aa]">
              Pricing
            </h2>
            <p className="mx-auto mb-12 max-w-md text-center text-pretty text-[#a1a1aa]">
              One page of a document costs one page of your balance. Buy a pack, spend it whenever,
              buy another when it runs out.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PAGE_PACKS.map((pack) => {
                const isPopular = pack.id === DEFAULT_PAGE_PACK_ID;
                return (
                  <div
                    key={pack.id}
                    className={`relative flex flex-col rounded-xl border bg-[#111111] p-6 ${
                      isPopular ? "border-[#22c55e]/40" : "border-white/[0.08]"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-2.5 left-6 rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#080808]">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-base font-medium text-white">{pack.name}</h3>
                    <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-white">
                      ${pack.usd}
                    </p>
                    <p className="mt-1 text-sm text-[#a1a1aa]">
                      {pack.pages.toLocaleString()} pages
                    </p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-[#a1a1aa]">
                      {perPageCents(pack).toFixed(1)}&cent; per page
                    </p>
                    <Link
                      href="/signup"
                      className={`mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        isPopular
                          ? "bg-[#22c55e] text-[#080808] hover:bg-[#22c55e]/90"
                          : "border border-white/[0.12] text-[#a1a1aa] hover:border-white/20 hover:text-white"
                      }`}
                    >
                      Buy pages
                    </Link>
                  </div>
                );
              })}
            </div>

            <p className="mt-10 text-center text-xs text-[#a1a1aa]">
              One-time purchase, no recurring charge. Payments are handled securely by Paddle.
            </p>
          </div>
        </section>

        {/* Reference */}
        <section id="reference" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-[#a1a1aa]">
              API reference
            </h2>
            <p className="mx-auto mb-12 max-w-md text-center text-pretty text-[#a1a1aa]">
              The whole API is two endpoints. Here is all of it.
            </p>
            <OcrApiReference origin={origin} layout="wide" keysHref="/signup" />
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-white/[0.08] bg-[#0a0a0a] px-4 py-20 text-center sm:px-6">
          <div className="mx-auto max-w-xl">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Create an account, buy a pack, start reading documents.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-[#a1a1aa]">
              You get your first key the moment your pack clears. Nothing renews and nothing
              expires.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-[#080808] transition-colors hover:bg-[#22c55e]/90"
              >
                Get an API key
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-white"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-lg text-[#22c55e]">[ ]</span>
            <span className="font-medium text-[#a1a1aa]">404tools.dev</span>
          </Link>
          {/* Paddle reviews the root domain and requires the terms, privacy and
              refund pages to be reachable from it, so these links live in the
              footer of every page rather than only on the legal pages. */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#a1a1aa]">
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/refund-policy" className="transition-colors hover:text-white">
              Refund Policy
            </Link>
            <a href="mailto:support@404tools.dev" className="transition-colors hover:text-white">
              Contact
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/M-Usman10/404tools"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="text-[#a1a1aa] transition-colors hover:text-white"
            >
              <Github className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
