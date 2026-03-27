import Link from "next/link";
import { ArrowRight, Github, Twitter } from "lucide-react";

const tools = [
  {
    name: "Cron Vision",
    description: "Visualize any cron expression. See exactly when your job runs — heatmap, next runs, plain English translation.",
    tags: ["#cron", "#scheduler", "#devops"],
    href: "/cronvis",
    live: true,
  },
  {
    name: "Coming soon",
    tags: ["#regex"],
    live: false,
  },
  {
    name: "Coming soon",
    tags: ["#json"],
    live: false,
  },
  {
    name: "Coming soon",
    tags: ["#jwt"],
    live: false,
  },
  {
    name: "Coming soon",
    tags: ["#sql"],
    live: false,
  },
  {
    name: "Coming soon",
    tags: ["#uuid"],
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
            1 tool live · More shipping rapidly
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
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3 md:gap-8">
          <div className="text-center md:text-left">
            <h3 className="mb-2 font-medium text-white">No login</h3>
            <p className="text-sm text-[#666]">
              Use any tool instantly. No accounts, no email, no friction.
            </p>
          </div>
          <div className="border-t border-white/[0.08] pt-8 text-center md:border-l md:border-t-0 md:pl-8 md:pt-0 md:text-left">
            <h3 className="mb-2 font-medium text-white">No bloat</h3>
            <p className="text-sm text-[#666]">
              Every tool does one thing. Nothing more.
            </p>
          </div>
          <div className="border-t border-white/[0.08] pt-8 text-center md:border-l md:border-t-0 md:pl-8 md:pt-0 md:text-left">
            <h3 className="mb-2 font-medium text-white">No cost</h3>
            <p className="text-sm text-[#666]">
              Free forever. Always.
            </p>
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
  if (!tool.live) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-[#111111]/50 p-5 opacity-50">
        <p className="mb-3 text-lg font-medium text-[#555]">{tool.name}</p>
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.03] px-2 py-0.5 text-xs text-[#444]"
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
      className="group relative rounded-xl border border-white/[0.08] bg-[#111111] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-xs text-[#22c55e]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
        Live
      </div>
      <h3 className="mb-2 text-lg font-medium text-white">{tool.name}</h3>
      <p className="mb-4 text-sm leading-relaxed text-[#888]">
        {tool.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-[#666]"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1 text-sm text-[#22c55e] opacity-0 transition-opacity group-hover:opacity-100">
          Open tool
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
