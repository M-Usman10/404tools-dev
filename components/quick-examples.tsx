"use client";

import { cn } from "@/lib/utils";

interface QuickExamplesProps {
  onSelect: (expression: string) => void;
  current: string;
}

const EXAMPLES = [
  { label: "Every minute", expr: "* * * * *" },
  { label: "Every hour", expr: "0 * * * *" },
  { label: "Daily at midnight", expr: "0 0 * * *" },
  { label: "Every 5 minutes", expr: "*/5 * * * *" },
  { label: "Every weekday 9am", expr: "0 9 * * 1-5" },
  { label: "Every Sunday", expr: "0 0 * * 0" },
  { label: "Monthly", expr: "0 0 1 * *" },
];

export function QuickExamples({ onSelect, current }: QuickExamplesProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Quick Examples
      </h2>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:overflow-x-auto sm:pb-2">
        {EXAMPLES.map((example) => {
          const isActive = current.trim() === example.expr;
          return (
            <button
              key={example.expr}
              onClick={() => onSelect(example.expr)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-secondary text-secondary-foreground hover:border-accent/50 hover:bg-accent/10"
              )}
            >
              <span className="block">{example.label}</span>
              <span className="block font-mono text-xs text-muted-foreground">
                {example.expr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
