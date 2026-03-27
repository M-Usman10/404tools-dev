"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { CronInput } from "@/components/cron-input";
import { HumanReadable } from "@/components/human-readable";
import { NextRuns } from "@/components/next-runs";
import { QuickExamples } from "@/components/quick-examples";
import { FieldReference } from "@/components/field-reference";
import {
  parseCron,
  getNextRuns,
  describeExpression,
} from "@/lib/cron-parser";
import { ArrowLeft } from "lucide-react";

export default function CronVision() {
  const [expression, setExpression] = useState("* * * * *");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { isValid, error, parsed, description, nextRuns } =
    useMemo(() => {
      try {
        const parsed = parseCron(expression);
        const description = describeExpression(expression);
        const nextRuns = mounted ? getNextRuns(expression, 5) : [];
        return { isValid: true, error: null, parsed, description, nextRuns };
      } catch (e) {
        return {
          isValid: false,
          error: e instanceof Error ? e.message : "Invalid expression",
          parsed: null,
          description: null,
          nextRuns: [],
        };
      }
    }, [expression, mounted]);

  return (
    <main className="min-h-screen bg-[#080808]">
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link 
          href="/" 
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#888] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to 404tools.dev
        </Link>

        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span>Live</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Cron Vision
          </h1>
          <p className="mt-3 text-lg text-[#888]">
            Paste any cron expression to visualize it.
          </p>
        </header>

        {/* Input Section */}
        <section className="mb-10">
          <CronInput
            value={expression}
            onChange={setExpression}
            isValid={isValid}
            error={error}
            parsed={parsed}
          />
        </section>

        {/* Human Readable */}
        <section className="mb-6">
          <HumanReadable description={description} isValid={isValid} />
        </section>

        {/* Next 5 Run Times */}
        <section className="mb-6">
          <NextRuns runs={nextRuns} isValid={isValid} />
        </section>

        {/* Field Reference */}
        <section className="mb-6">
          <FieldReference />
        </section>

        {/* Quick Examples */}
        <section className="mb-8">
          <QuickExamples onSelect={setExpression} current={expression} />
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-[#555]">
          <p>Part of <Link href="/" className="text-[#888] hover:text-white transition-colors">404tools.dev</Link></p>
        </footer>
      </div>
    </main>
  );
}
