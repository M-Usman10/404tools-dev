import Link from "next/link";
import { ArrowRight, Github, Twitter } from "lucide-react";

const tools = [
  {
    name: "Cron Vision",
    description:
      "Visualize any cron expression. See exactly when your job runs — next runs, plain English translation, and per-field breakdown.",
    tags: ["#cron", "#scheduler", "#devops"],
    href: "/cronvis",
    live: true,
  },
  { name: "Coming soon", tags: ["#regex"], live: false },
  { name: "Coming soon", tags: ["#json"], live: false },
  { name: "Coming soon", tags: ["#jwt"], live: false },
  { name: "Coming soon", tags: ["#sql"], live: false },
  { name: "Coming soon", tags: ["#uuid"], live: false },
];

const philosophy = [
  {
    heading: "No login",
    body: "Use any tool instantly. No accounts, no email, no friction.",
    symbol: "01",
  },
  {
    heading: "No bloat",
    body: "Every tool does one thing. Nothing more.",
    symbol: "02",
  },
  {
    heading: "No cost",
    body: "Free forever. Always.",
    symbol: "03",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[#0f172a]/[0.07] bg-[#f8fafc]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold text-[#0f172a]">[ ]</span>
            <span className="font-semibold tracking-tight">404tools.dev</span>
          </Link>
          <a
            href="https://github.com/M-Usman10/404tools"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[#0f172a]/[0.12] px-3 py-1.5 text-sm text-[#475569] transition-all duration-150 hover:border-[#0f172a]/30 hover:text-[#0f172a]"
          >
            Submit a tool
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="mx-auto max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#0f172a]/10 bg-[#0f172a]/[0.04] px-3.5 py-1 text-sm font-medium text-[#475569]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0f172a]" />
            Free forever · No login required
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#0f172a] sm:text-5xl lg:text-[3.75rem] lg:leading-[1.1]">
            Developer tools,<br />all in one place.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-[#64748b]">
            A growing collection of fast, focused developer utilities. No bloat, no accounts, just tools.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#tools"
              className="inline-flex items-center gap-2 rounded-md bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-[#1e293b]"
            >
              Explore tools
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/M-Usman10/404tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[#0f172a]/[0.12] px-5 py-2.5 text-sm font-medium text-[#475569] transition-all duration-150 hover:border-[#0f172a]/25 hover:text-[#0f172a]"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
          <p className="mt-7 text-sm text-[#94a3b8]">
            1 tool live · More shipping rapidly
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-[#94a3b8]">
            Tools
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool, i) => (
              <ToolCard key={i} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-y border-[#0f172a]/[0.07] bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-xs font-semibold uppercase tracking-widest text-[#94a3b8]">
            Principles
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {philosophy.map((item) => (
              <div key={item.heading} className="group">
                <p className="mb-4 font-mono text-xs text-[#cbd5e1]">{item.symbol}</p>
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-[#0f172a]">
                  {item.heading}
                </h3>
                <p className="text-[15px] leading-relaxed text-[#64748b]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#0f172a]/[0.07] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold text-[#0f172a]">[ ]</span>
            <span className="text-sm font-medium text-[#475569]">404tools.dev</span>
          </Link>
          <p className="text-sm text-[#94a3b8]">
            Built for developers, by developers
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#94a3b8] transition-colors duration-150 hover:text-[#0f172a]"
            >
              <Twitter className="h-4.5 w-4.5" />
            </a>
            <a
              href="https://github.com/M-Usman10/404tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#94a3b8] transition-colors duration-150 hover:text-[#0f172a]"
            >
              <Github className="h-4.5 w-4.5" />
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
  if (!tool.live) {
    return (
      <div className="rounded-xl border border-[#0f172a]/[0.06] bg-[#f8fafc] p-5 opacity-50">
        <p className="mb-3 text-base font-medium text-[#94a3b8]">{tool.name}</p>
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[#0f172a]/[0.04] px-2 py-0.5 text-xs text-[#94a3b8]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={tool.href || "#"}
      className="group relative rounded-xl border border-[#0f172a]/[0.09] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0f172a]/20 hover:shadow-md"
    >
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#0f172a]/10 bg-[#0f172a]/[0.04] px-2.5 py-0.5 text-xs font-medium text-[#0f172a]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0f172a]" />
        Live
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-[#0f172a]">
        {tool.name}
      </h3>
      <p className="mb-4 text-sm leading-relaxed text-[#64748b]">
        {tool.description}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[#0f172a]/[0.05] px-2 py-0.5 text-xs text-[#475569]"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-[#0f172a] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
