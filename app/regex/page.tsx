"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  buildRegex,
  getMatches,
  applyReplace,
  escapeHTML,
  pythonToJS,
  cheatsheet,
  type Match,
} from "@/lib/regex-utils";

type Flavor = "js" | "python";
type Flag = "g" | "i" | "m" | "s";

const FLAG_TOOLTIPS: Record<Flag, string> = {
  g: "global — find all matches",
  i: "case insensitive",
  m: "multiline — ^ and $ match line boundaries",
  s: "dotAll — . matches newlines",
};

export default function RegexTester() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)\\.(\\w+)");
  const [flags, setFlags] = useState<Set<Flag>>(new Set(["g"]));
  const [testString, setTestString] = useState(
    "hello from user@gmail.com and admin@404tools.dev"
  );
  const [flavor, setFlavor] = useState<Flavor>("js");
  const [replaceEnabled, setReplaceEnabled] = useState(false);
  const [replaceWith, setReplaceWith] = useState("");
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  
  const patternInputRef = useRef<HTMLInputElement>(null);

  const toggleFlag = (flag: Flag) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) {
        next.delete(flag);
      } else {
        next.add(flag);
      }
      return next;
    });
  };

  const flagString = useMemo(() => Array.from(flags).join(""), [flags]);

  const { regex, error, matches, pythonWarnings } = useMemo(() => {
    let workingPattern = pattern;
    let pythonWarnings: string[] = [];

    if (flavor === "python") {
      const converted = pythonToJS(pattern);
      workingPattern = converted.pattern;
      pythonWarnings = converted.warnings;
    }

    const { regex, error } = buildRegex(workingPattern, flagString);
    const matches = regex ? getMatches(regex, testString) : [];

    return { regex, error, matches, pythonWarnings };
  }, [pattern, flagString, testString, flavor]);

  const replaceResult = useMemo(() => {
    if (!regex || !replaceEnabled) return "";
    return applyReplace(regex, testString, replaceWith);
  }, [regex, testString, replaceWith, replaceEnabled]);

  const highlightedHTML = useMemo(() => {
    if (!matches.length) return escapeHTML(testString);
    
    let result = "";
    let cursor = 0;
    
    for (const match of matches) {
      result += escapeHTML(testString.slice(cursor, match.index));
      result += `<mark class="bg-[#22c55e]/25 border-b border-[#22c55e] rounded-sm">${escapeHTML(match.value)}</mark>`;
      cursor = match.end;
    }
    
    result += escapeHTML(testString.slice(cursor));
    return result;
  }, [testString, matches]);

  const groupCount = useMemo(() => {
    if (!matches.length) return 0;
    return matches[0].groups.length + Object.keys(matches[0].namedGroups).length;
  }, [matches]);

  const insertToken = useCallback((token: string) => {
    if (!patternInputRef.current) return;
    const input = patternInputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = input.value;
    const newVal = val.slice(0, start) + token + val.slice(end);
    setPattern(newVal);
    setTimeout(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + token.length;
    }, 0);
  }, []);

  return (
    <main className="min-h-screen bg-[#080808]">
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#888] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          404tools.dev
        </Link>

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span>Live</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Regex Tester
          </h1>
          <p className="mt-3 text-lg text-[#888]">
            Test, debug and understand regular expressions in real time.
          </p>
        </header>

        {/* Section 1: Regex Input Bar */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#555]">
              Pattern
            </h2>
            {/* Flavor toggle */}
            <div className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#111] p-0.5">
              <button
                onClick={() => setFlavor("js")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  flavor === "js"
                    ? "bg-[#22c55e] text-[#080808]"
                    : "text-[#666] hover:text-white"
                }`}
              >
                JS
              </button>
              <button
                onClick={() => setFlavor("python")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  flavor === "python"
                    ? "bg-[#22c55e] text-[#080808]"
                    : "text-[#666] hover:text-white"
                }`}
              >
                Python
              </button>
            </div>
          </div>

          {flavor === "python" && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-[#f59e0b]/20 bg-[#f59e0b]/10 px-3 py-2 text-xs text-[#f59e0b]">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Python syntax preview — execution runs as JS with auto-conversion</span>
            </div>
          )}

          {pythonWarnings.length > 0 && (
            <div className="mb-3 flex flex-col gap-1 rounded-md border border-[#f59e0b]/20 bg-[#f59e0b]/10 px-3 py-2 text-xs text-[#f59e0b]">
              {pythonWarnings.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
          )}

          <div
            className={`flex items-center gap-2 rounded-xl border bg-[#111] p-3 transition-colors ${
              error ? "border-red-500/50" : "border-white/[0.08]"
            }`}
          >
            <span className="font-mono text-lg text-[#555]">/</span>
            <input
              ref={patternInputRef}
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="flex-1 bg-transparent font-mono text-lg text-white outline-none placeholder:text-[#444]"
              placeholder="Enter regex pattern..."
              autoFocus
            />
            <span className="font-mono text-lg text-[#555]">/</span>
            
            {/* Flag toggles */}
            <div className="flex items-center gap-1 ml-2">
              {(["g", "i", "m", "s"] as Flag[]).map((flag) => (
                <button
                  key={flag}
                  onClick={() => toggleFlag(flag)}
                  title={FLAG_TOOLTIPS[flag]}
                  className={`h-7 w-7 rounded-md font-mono text-sm font-medium transition-colors ${
                    flags.has(flag)
                      ? "bg-[#22c55e] text-[#080808]"
                      : "border border-white/[0.08] text-[#666] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-400">Invalid regex: {error}</p>
          )}
        </section>

        {/* Section 2: Two Column Layout */}
        <section className="mb-8 grid gap-6 lg:grid-cols-5">
          {/* Left: Test String (60%) */}
          <div className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-widest text-[#555]">
                Test String
              </h2>
              {regex && (
                <div className="flex items-center gap-2 text-xs">
                  {matches.length > 0 ? (
                    <span className="text-[#22c55e]">
                      {matches.length} match{matches.length !== 1 && "es"}
                      {groupCount > 0 && ` · ${groupCount} group${groupCount !== 1 && "s"}`}
                    </span>
                  ) : (
                    <span className="text-[#888]">No matches</span>
                  )}
                </div>
              )}
            </div>
            <div
              className={`relative rounded-xl border bg-[#111] transition-colors ${
                error
                  ? "border-[#f59e0b]/50"
                  : matches.length === 0 && regex
                  ? "border-red-500/30"
                  : "border-white/[0.08]"
              }`}
            >
              {/* Highlighted overlay */}
              <div
                className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed text-transparent"
                style={{ wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{ __html: highlightedHTML }}
              />
              {/* Editable textarea */}
              <textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                className="relative w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-white outline-none"
                style={{ 
                  caretColor: "white",
                  color: "transparent",
                  WebkitTextFillColor: "white",
                }}
                rows={8}
                placeholder="Enter test string..."
              />
            </div>
          </div>

          {/* Right: Match List (40%) */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[#555]">
              Matches
            </h2>
            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#111] p-3">
              {matches.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-center text-sm text-[#555]">
                  {error ? (
                    "Fix the pattern to see matches"
                  ) : (
                    <span>
                      No matches found.
                      <br />
                      <span className="text-xs">Try adjusting your pattern or flags.</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {matches.map((match, i) => (
                    <MatchCard key={i} match={match} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Replace Mode */}
        <section className="mb-8">
          <button
            onClick={() => setReplaceEnabled(!replaceEnabled)}
            className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#111] px-4 py-3 text-left transition-colors hover:border-white/20"
          >
            <span className="text-xs font-medium uppercase tracking-widest text-[#555]">
              Replace
            </span>
            <div
              className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                replaceEnabled ? "bg-[#22c55e]" : "bg-[#333]"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white transition-transform ${
                  replaceEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
          </button>

          {replaceEnabled && (
            <div className="rounded-xl border border-white/[0.08] bg-[#111] p-4">
              <div className="mb-3">
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#555]">
                  Replace with
                </label>
                <input
                  type="text"
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#080808] px-3 py-2 font-mono text-sm text-white outline-none transition-colors focus:border-[#22c55e]/50"
                  placeholder={flavor === "js" ? "$1, $2, ..." : "\\1, \\2, ..."}
                />
                <p className="mt-2 text-xs text-[#555]">
                  Use {flavor === "js" ? "$1, $2" : "\\1, \\2"} to reference capture groups
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#555]">
                  Result
                </label>
                <div className="rounded-lg border-l-2 border-[#22c55e] bg-[#080808] p-3">
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-[#888]">
                    {replaceResult || testString}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 4: Cheatsheet */}
        <section className="mb-8">
          <button
            onClick={() => setCheatsheetOpen(!cheatsheetOpen)}
            className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#111] px-4 py-3 text-left transition-colors hover:border-white/20"
          >
            <span className="text-xs font-medium uppercase tracking-widest text-[#555]">
              Cheatsheet
            </span>
            {cheatsheetOpen ? (
              <ChevronUp className="h-4 w-4 text-[#555]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#555]" />
            )}
          </button>

          {cheatsheetOpen && (
            <div className="rounded-xl border border-white/[0.08] bg-[#111] p-4">
              <div className="grid gap-6 md:grid-cols-3">
                <CheatsheetGroup
                  title="Characters"
                  items={cheatsheet.characters}
                  onInsert={insertToken}
                />
                <CheatsheetGroup
                  title="Quantifiers"
                  items={cheatsheet.quantifiers}
                  onInsert={insertToken}
                />
                <CheatsheetGroup
                  title="Groups & Anchors"
                  items={cheatsheet.groups}
                  onInsert={insertToken}
                />
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-[#555]">
          <p>
            Part of{" "}
            <Link
              href="/"
              className="text-[#888] transition-colors hover:text-white"
            >
              404tools.dev
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

function MatchCard({ match, index }: { match: Match; index: number }) {
  const hasGroups = match.groups.length > 0 || Object.keys(match.namedGroups).length > 0;

  return (
    <div className="rounded-lg border border-white/[0.05] bg-[#080808] p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="shrink-0 font-mono text-xs text-[#22c55e]/70">
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <code className="block break-all font-mono text-sm text-white">
            {match.value}
          </code>
          <span className="mt-1 block text-xs text-[#555]">
            index {match.index}–{match.end}
          </span>
        </div>
      </div>

      {hasGroups && (
        <div className="mt-2 border-t border-white/[0.05] pt-2">
          {match.groups.map((g, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <span className="text-[#666]">Group {i + 1}:</span>
              <code className="font-mono text-[#888]">{g}</code>
            </div>
          ))}
          {Object.entries(match.namedGroups).map(([name, value]) => (
            <div key={name} className="flex items-baseline gap-2 text-xs">
              <span className="text-[#666]">Group &quot;{name}&quot;:</span>
              <code className="font-mono text-[#888]">{value}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheatsheetGroup({
  title,
  items,
  onInsert,
}: {
  title: string;
  items: { token: string; desc: string }[];
  onInsert: (token: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-[#666]">
        {title}
      </h3>
      <div className="flex flex-col gap-1">
        {items.map(({ token, desc }) => (
          <button
            key={token}
            onClick={() => onInsert(token)}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-white/[0.05]"
          >
            <code className="shrink-0 font-mono text-sm text-[#22c55e]">
              {token}
            </code>
            <span className="text-xs text-[#666]">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
