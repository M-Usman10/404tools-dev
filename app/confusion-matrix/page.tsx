"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  parseLabels,
  getClasses,
  buildMatrix,
  classMetrics,
  macroAvg,
  weightedAvg,
  accuracy,
  detectClassType,
} from "@/lib/confusion-matrix";

const DEFAULT_GROUND_TRUTH = "1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0";
const DEFAULT_PREDICTIONS = "1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1";

export default function ConfusionMatrixAnalyzer() {
  const [groundTruth, setGroundTruth] = useState(DEFAULT_GROUND_TRUTH);
  const [predictions, setPredictions] = useState(DEFAULT_PREDICTIONS);
  const [analyzed, setAnalyzed] = useState(true);

  const analysis = useMemo(() => {
    if (!analyzed) return null;

    const gtLabels = parseLabels(groundTruth);
    const predLabels = parseLabels(predictions);

    if (gtLabels.length === 0 || predLabels.length === 0) {
      return { error: "Paste your labels to get started." };
    }

    if (gtLabels.length !== predLabels.length) {
      return { error: "Prediction and ground truth arrays must be the same length." };
    }

    const classes = getClasses(gtLabels, predLabels);
    const matrix = buildMatrix(gtLabels, predLabels, classes);
    const metrics = classMetrics(matrix, classes);
    const macro = macroAvg(metrics);
    const weighted = weightedAvg(metrics);
    const acc = accuracy(matrix);
    const classType = detectClassType(classes);

    return {
      classes,
      matrix,
      metrics,
      macro,
      weighted,
      accuracy: acc,
      classType,
    };
  }, [groundTruth, predictions, analyzed]);

  const hasError = analysis && "error" in analysis;
  const data = analysis && !hasError ? analysis : null;

  const getColorClass = (value: number) => {
    if (value >= 0.8) return "text-[#22c55e]";
    if (value >= 0.6) return "text-[#f59e0b]";
    return "text-[#ef4444]";
  };

  const handleAnalyze = () => {
    setAnalyzed(false);
    setTimeout(() => setAnalyzed(true), 50);
  };

  return (
    <main className="min-h-screen bg-[#080808]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#888] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to 404tools.dev
        </Link>

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-1 text-sm text-[#22c55e]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span>Live</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Confusion Matrix Analyzer
          </h1>
          <p className="mt-3 text-base text-[#888]">
            Paste your predictions and ground truth labels to evaluate your model instantly.
          </p>
        </header>

        {/* Section 1: Input */}
        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#666]">
                Ground Truth
              </label>
              <textarea
                value={groundTruth}
                onChange={(e) => setGroundTruth(e.target.value)}
                placeholder="0, 1, 1, 0, 1, 0, 0, 1"
                className={`h-24 w-full resize-none rounded-xl border bg-[#111] p-4 font-mono text-sm text-white placeholder-[#444] transition-colors focus:outline-none focus:ring-1 focus:ring-[#22c55e] ${
                  hasError ? "border-[#ef4444]" : "border-white/[0.08]"
                }`}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#666]">
                Predictions
              </label>
              <textarea
                value={predictions}
                onChange={(e) => setPredictions(e.target.value)}
                placeholder="0, 1, 0, 0, 1, 1, 0, 1"
                className={`h-24 w-full resize-none rounded-xl border bg-[#111] p-4 font-mono text-sm text-white placeholder-[#444] transition-colors focus:outline-none focus:ring-1 focus:ring-[#22c55e] ${
                  hasError ? "border-[#ef4444]" : "border-white/[0.08]"
                }`}
              />
            </div>
          </div>

          {/* Class type badge + error */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              {data && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#888]">
                  {data.classType.type === "binary" ? "Binary" : `Multi-class · ${data.classType.count} classes`}
                </span>
              )}
              {hasError && (
                <span className="text-sm text-[#ef4444]">{analysis.error}</span>
              )}
            </div>
            <button
              onClick={handleAnalyze}
              className="inline-flex items-center gap-2 rounded-lg bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-[#080808] transition-colors hover:bg-[#22c55e]/90"
            >
              Analyze
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {data && (
          <div className="animate-in fade-in duration-300">
            {/* Section 2: Metric cards */}
            <section className="mb-8">
              <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-[#555]">
                Metrics {data.classType.type === "multiclass" && <span className="text-[#666]">· macro avg</span>}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Accuracy", value: data.accuracy },
                  { label: "Precision", value: data.macro.precision },
                  { label: "Recall", value: data.macro.recall },
                  { label: "F1 Score", value: data.macro.f1 },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.08] bg-[#111] p-4"
                  >
                    <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[#666]">
                      {label}
                    </p>
                    <p className={`font-mono text-2xl font-semibold ${getColorClass(value)}`}>
                      {label === "Accuracy" ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Confusion Matrix Heatmap */}
            <section className="mb-8">
              <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-[#555]">
                Confusion Matrix
              </h2>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111] p-4">
                <div className="min-w-fit">
                  {/* Header row */}
                  <div className="mb-2 flex items-center gap-1">
                    <div className="h-10 w-16 shrink-0" />
                    <div className="w-14 shrink-0" />
                    <div className="flex flex-1 justify-center">
                      <span className="text-xs font-medium uppercase tracking-widest text-[#666]">
                        Predicted
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-10 w-16 shrink-0" />
                    <div className="w-14 shrink-0" />
                    {data.classes.map((cls) => (
                      <div
                        key={`h-${cls}`}
                        className="flex h-10 w-14 items-center justify-center text-xs font-medium text-[#888]"
                      >
                        {cls}
                      </div>
                    ))}
                  </div>

                  {/* Matrix rows */}
                  <div className="flex">
                    <div className="flex w-16 shrink-0 flex-col items-center justify-center">
                      <span className="rotate-180 text-xs font-medium uppercase tracking-widest text-[#666]" style={{ writingMode: "vertical-rl" }}>
                        Actual
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {data.matrix.map((row, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center text-xs font-medium text-[#888]">
                            {data.classes[i]}
                          </div>
                          {row.map((count, j) => {
                            const maxCount = Math.max(...data.matrix.flat());
                            const intensity = maxCount > 0 ? count / maxCount : 0;
                            const isDiagonal = i === j;
                            return (
                              <div
                                key={j}
                                className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border transition-colors ${
                                  isDiagonal
                                    ? "border-[#22c55e]/30"
                                    : "border-white/[0.04]"
                                }`}
                                style={{
                                  backgroundColor: `rgba(34, 197, 94, ${0.1 + intensity * 0.6})`,
                                }}
                              >
                                <span className="font-mono text-sm font-semibold text-white">
                                  {count}
                                </span>
                                {data.classes.length === 2 && (
                                  <span className="text-[9px] text-[#888]">
                                    {i === 0 && j === 0 && "TN"}
                                    {i === 0 && j === 1 && "FP"}
                                    {i === 1 && j === 0 && "FN"}
                                    {i === 1 && j === 1 && "TP"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-xs text-[#555]">
                  darker = fewer predictions · brighter = more
                </p>
              </div>
            </section>

            {/* Section 4: Per-class breakdown table */}
            <section className="mb-8">
              <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-[#555]">
                Per-Class Breakdown
              </h2>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111]">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-[#666]">
                        Class
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-[#666]">
                        Precision
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-[#666]">
                        Recall
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-[#666]">
                        F1
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-widest text-[#666]">
                        Support
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.metrics.map((m) => (
                      <tr
                        key={m.cls}
                        className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-white">{m.cls}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#888]">
                          {m.precision.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#888]">
                          {m.recall.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#888]">
                          {m.f1.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#888]">
                          {m.support}
                        </td>
                      </tr>
                    ))}
                    {/* Macro avg */}
                    <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm font-semibold text-white">macro avg</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-white">
                        {data.macro.precision.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-white">
                        {data.macro.recall.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-white">
                        {data.macro.f1.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-[#888]">
                        {data.metrics.reduce((s, m) => s + m.support, 0)}
                      </td>
                    </tr>
                    {/* Weighted avg */}
                    <tr className="bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm font-semibold text-white">weighted avg</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-white">
                        {data.weighted.precision.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-white">
                        {data.weighted.recall.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-medium text-white">
                        {data.weighted.f1.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-[#888]">
                        {data.metrics.reduce((s, m) => s + m.support, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-[#555]">
          <p>
            Part of{" "}
            <Link href="/" className="text-[#888] transition-colors hover:text-white">
              404tools.dev
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
