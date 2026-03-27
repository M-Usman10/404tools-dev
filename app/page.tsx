"use client";

import { useState, useMemo, useEffect } from "react";
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

export default function CronVision() {
  const [expression, setExpression] = useState("* * * * *");
  const [mounted, setMounted] = useState(false);

  // Only run time-dependent calculations on the client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const { isValid, error, parsed, description, nextRuns } =
    useMemo(() => {
      try {
        const parsed = parseCron(expression);
        const description = describeExpression(expression);
        // Only calculate time-dependent values after mount to avoid hydration issues
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
    <main className="min-h-screen bg-background">
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-transparent" />
      
      <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {/* Header */}
        <header className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span>Developer Tool</span>
          </div>
          <h1 className="text-balance bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            Cron Vision
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground sm:text-xl">
            Paste any cron expression to visualize it.
          </p>
        </header>

        {/* Input Section */}
        <section className="mb-12">
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
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Built for developers who work with scheduled tasks.</p>
        </footer>
      </div>
    </main>
  );
}
