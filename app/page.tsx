"use client";

import { useState, useMemo } from "react";
import { CronInput } from "@/components/cron-input";
import { HumanReadable } from "@/components/human-readable";
import { NextRuns } from "@/components/next-runs";
import { WeeklyHeatmap } from "@/components/weekly-heatmap";
import { QuickExamples } from "@/components/quick-examples";
import { FieldReference } from "@/components/field-reference";
import {
  parseCron,
  getNextRuns,
  getWeeklyHeatmap,
  describeExpression,
} from "@/lib/cron-parser";

export default function CronVision() {
  const [expression, setExpression] = useState("* * * * *");

  const { isValid, error, parsed, description, nextRuns, heatmap } =
    useMemo(() => {
      try {
        const parsed = parseCron(expression);
        const description = describeExpression(expression);
        const nextRuns = getNextRuns(expression, 5);
        const heatmap = getWeeklyHeatmap(expression);
        return { isValid: true, error: null, parsed, description, nextRuns, heatmap };
      } catch (e) {
        return {
          isValid: false,
          error: e instanceof Error ? e.message : "Invalid expression",
          parsed: null,
          description: null,
          nextRuns: [],
          heatmap: Array.from({ length: 7 }, () => Array(24).fill(false)),
        };
      }
    }, [expression]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Cron Vision
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
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
        <section className="mb-10">
          <HumanReadable description={description} isValid={isValid} />
        </section>

        {/* Next 5 Run Times */}
        <section className="mb-10">
          <NextRuns runs={nextRuns} isValid={isValid} />
        </section>

        {/* Weekly Heatmap */}
        <section className="mb-10">
          <WeeklyHeatmap heatmap={heatmap} isValid={isValid} />
        </section>

        {/* Quick Examples */}
        <section className="mb-10">
          <QuickExamples onSelect={setExpression} current={expression} />
        </section>

        {/* Field Reference */}
        <section>
          <FieldReference />
        </section>
      </div>
    </main>
  );
}
