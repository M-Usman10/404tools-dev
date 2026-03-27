import Link from "next/link";
import { ArrowRight, Github, Twitter } from "lucide-react";

const tools = [
  {
    name: "Cron Vision",
    description: "Visualize any cron expression. See exactly when your job runs — next runs, plain English translation.",
    tags: ["#cron", "#scheduler", "#devops"],
    href: "/cronvis",
    live: true,
  },
  {
    name: "Confusion Matrix",
    description: "Evaluate ML models instantly. Paste predictions and ground truth to see accuracy, precision, recall, F1, and ROC curves.",
    tags: ["#ml", "#metrics", "#evaluation"],
    href: "/confusion-matrix",
    live: true,
  },
  {
    name: "Regex Tester",
    description: "Test and debug regular expressions in real time. Match highlighting, capture groups, and flags — all visible at a glance.",
    tags: ["#regex", "#strings", "#testing"],
    href: "/regex",
    live: true,
  },
  {
    name: "JSON Formatter",
    description: "Paste raw JSON and instantly get it formatted, validated, and syntax-highlighted. Minify or beautify in one click.",
    tags: ["#json", "#formatter", "#api"],
    live: false,
  },

  {
    name: "SQL Formatter",
    description: "Format messy SQL queries into clean, readable statements. Supports multiple dialects including PostgreSQL and MySQL.",
    tags: ["#sql", "#database", "#queries"],
    live: false,
  },
  {
    name: "UUID Generator",
    description: "Generate cryptographically random UUIDs (v4) in bulk. Copy single or batch output instantly.",
    tags: ["#uuid", "#random", "#ids"],
    live: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#22c55e] font-mono text-lg">[ ]</span>
            <span className="font-medium">404tools.dev</span>
          </Link>
          <a
            href="https://github.com/M-Usman10/404tools"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/[0.12] px-3 py-1.5 text-sm text-[#888] transition-colors hover:border-white/20 hover:text-white"
          >
            Submit a tool
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
            <span>Free forever</span>
            <span className="text-[#22c55e]/50">·</span>
            <span>No login required</span>
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Developer tools, all in one place.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg text-[#888]">
            A growing collection of fast, focused developer utilities. No bloat, no accounts, just tools.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#tools"
              className="inline-flex items-center gap-2 rounded-md bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-[#080808] transition-colors hover:bg-[#22c55e]/90"
            >
              Explore tools
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/M-Usman10/404tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-[#888] transition-colors hover:border-white/20 hover:text-white"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
          <p className="mt-8 text-sm text-[#555]">
            3 tools live · More shipping rapidly
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-[#555]">
            Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, i) => (
              <ToolCard key={i} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-y border-white/[0.08] bg-[#0a0a0a] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-center text-xs font-medium uppercase tracking-widest text-[#555]">Why 404tools</p>
          <div className="grid gap-px md:grid-cols-3">
            {[
              {
                no: "No login",
                body: "Use any tool instantly. No accounts, no email, no friction.",
                detail: "Open a tool. Use it. Leave. That's how it should work.",
              },
              {
                no: "No bloat",
                body: "Every tool does one thing. Nothing more.",
                detail: "No dashboards. No settings panels. No upgrade prompts.",
              },
              {
                no: "No cost",
                body: "Free forever. Always.",
                detail: "No freemium. No trial period. No credit card required.",
              },
            ].map(({ no, body, detail }) => (
              <div
                key={no}
                className="group relative overflow-hidden rounded-none border-0 bg-transparent px-8 py-10 md:px-10 md:first:pl-0 md:last:pr-0"
              >
                {/* Vertical divider for md+ */}
                <div className="absolute inset-y-0 right-0 hidden w-px bg-white/[0.06] md:block last:hidden" />
                {/* Green accent bar */}
                <div className="mb-6 h-px w-8 bg-[#22c55e]" />
                <h3 className="mb-1 text-lg font-semibold text-white">{no}</h3>
                <p className="mb-3 text-sm font-medium text-[#aaa]">{body}</p>
                <p className="text-xs leading-relaxed text-[#555]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#22c55e] font-mono text-lg">[ ]</span>
            <span className="font-medium text-[#888]">404tools.dev</span>
          </Link>
          <p className="text-sm text-[#555]">
            Built for developers, by developers
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#555] transition-colors hover:text-white"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/M-Usman10/404tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#555] transition-colors hover:text-white"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface Tool {
  name: string;
  description?: string;
  tags: string[];
  href?: string;
  live: boolean;
}

function ToolCard({ tool }: { tool: Tool }) {
  const inner = (
    <div className="flex h-40 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111] p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20">
      {tool.live ? (
        <div className="mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-xs text-[#22c55e]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          Live
        </div>
      ) : (
        <div className="mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-[#666]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#666]" />
          Coming soon
        </div>
      )}

      <h3 className="mb-1 text-sm font-medium text-white">{tool.name}</h3>
      <p className="mb-auto line-clamp-2 text-xs leading-relaxed text-[#666]">{tool.description}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tool.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-[#555]">
              {tag}
            </span>
          ))}
        </div>
        {tool.live && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-[#22c55e] opacity-0 transition-opacity group-hover:opacity-100">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );

  if (tool.live) {
    return <Link href={tool.href || "#"} className="group">{inner}</Link>;
  }

  return <div className="group cursor-default">{inner}</div>;
}
