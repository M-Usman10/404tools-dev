"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { symbol: "*", description: "any value" },
  { symbol: ",", description: "list separator" },
  { symbol: "-", description: "range" },
  { symbol: "/", description: "step" },
];

const FIELD_RANGES = [
  { field: "minute", range: "0–59", colorClass: "bg-cron-minute" },
  { field: "hour", range: "0–23", colorClass: "bg-cron-hour" },
  { field: "day of month", range: "1–31", colorClass: "bg-cron-dom" },
  { field: "month", range: "1–12", colorClass: "bg-cron-month" },
  { field: "day of week", range: "0–6 (Sun–Sat)", colorClass: "bg-cron-dow" },
];

export function FieldReference() {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <h2 className="text-xs font-semibold uppercase tracking-widest">
          Field Reference
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Symbols */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Symbols</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SYMBOLS.map(({ symbol, description }) => (
              <div
                key={symbol}
                className="flex items-center gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5"
              >
                <code className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-background font-mono text-xs font-bold text-accent">
                  {symbol}
                </code>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Field ranges */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Allowed Ranges</p>
          <div className="space-y-1.5">
            {FIELD_RANGES.map(({ field, range, colorClass }) => (
              <div
                key={field}
                className="flex items-center justify-between rounded-md bg-secondary/40 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", colorClass)} />
                  <span className="text-xs font-medium text-foreground">{field}</span>
                </div>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {range}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
