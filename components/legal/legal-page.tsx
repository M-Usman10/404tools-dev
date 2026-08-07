import Link from "next/link";
import { ArrowRight, FileText, Github, ShieldCheck, Wallet } from "lucide-react";

import type { LegalDocument } from "@/lib/legal-content";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-content";

// One renderer for all three policy pages. The palette is written out in the
// same literal hex classes the landing page uses rather than the theme tokens,
// because these pages sit alongside the marketing site and have to match it
// exactly, not the dashboard's app-shell override.

const legalLinks = [
  { href: "/terms", label: "Terms of Service", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { href: "/refund-policy", label: "Refund Policy", icon: Wallet },
];

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-lg text-[#22c55e]">[ ]</span>
            <span className="font-medium">404tools.dev</span>
          </Link>
          <Link
            href="/"
            className="rounded-md border border-white/[0.12] px-3 py-1.5 text-sm text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-white"
          >
            Back to tools
          </Link>
        </div>
      </nav>

      <main>
        <section className="border-b border-white/[0.08] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="max-w-2xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
                  {document.eyebrow}
                </div>
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  {document.title}
                </h1>
                <p className="mt-6 text-pretty text-lg leading-relaxed text-[#a1a1aa]">
                  {document.description}
                </p>
                <p className="mt-6 text-sm text-[#a1a1aa]">
                  Last updated {LEGAL_LAST_UPDATED}
                </p>
              </div>

              <aside className="rounded-xl border border-white/[0.08] bg-[#111111] p-6">
                <p className="text-base font-medium text-white">At a glance</p>
                <ul className="mt-5 space-y-2.5">
                  {document.summaryPoints.map((point) => (
                    <li
                      key={point}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-[#a1a1aa]"
                    >
                      {point}
                    </li>
                  ))}
                </ul>

                <p className="mb-3 mt-6 text-sm font-medium text-white">Related pages</p>
                <div className="space-y-2">
                  {legalLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-[#a1a1aa] transition-colors hover:border-white/20 hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[#22c55e]" aria-hidden="true" />
                          {link.label}
                        </span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-3xl gap-4">
            {document.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-xl border border-white/[0.08] bg-[#111111] p-6 md:p-8"
              >
                <h2 className="text-lg font-medium text-white">{section.title}</h2>
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-[#a1a1aa]">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets ? (
                    <ul className="space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-sm leading-7 text-[#a1a1aa]">
                          <span
                            className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]"
                            aria-hidden="true"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-lg text-[#22c55e]">[ ]</span>
            <span className="font-medium text-[#a1a1aa]">404tools.dev</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#a1a1aa]">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
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
