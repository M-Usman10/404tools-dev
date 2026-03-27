"use client";

import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

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
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2 text-muted-foreground">
        <Zap className="h-4 w-4" />
        <h2 className="text-xs font-semibold uppercase tracking-widest">
          Quick Examples
        </h2>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap sm:overflow-visible sm:pb-0">
        {EXAMPLES.map((example) => {
          const isActive = current.trim() === example.expr;
          return (
            <button
              key={example.expr}
              onClick={() => onSelect(example.expr)}
              className={cn(
                "group relative shrink-0 overflow-hidden rounded-lg border px-4 py-3 text-left transition-all duration-200",
                isActive
                  ? "border-accent/50 bg-accent/10 ring-1 ring-accent/20"
                  : "border-border bg-secondary/30 hover:border-border hover:bg-secondary/60"
              )}
            >
              {/* Subtle gradient on hover */}
              <div className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.05] to-transparent opacity-0 transition-opacity",
                isActive ? "opacity-100" : "group-hover:opacity-100"
              )} />
              
              <span className={cn(
                "relative block text-sm font-medium",
                isActive ? "text-accent" : "text-foreground"
              )}>
                {example.label}
              </span>
              <span className={cn(
                "relative mt-1 block font-mono text-xs",
                isActive ? "text-accent/70" : "text-muted-foreground"
              )}>
                {example.expr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
