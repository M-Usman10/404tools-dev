"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { symbol: "*", description: "any value" },
  { symbol: ",", description: "list separator" },
  { symbol: "-", description: "range" },
  { symbol: "/", description: "step" },
];

const FIELD_RANGES = [
  { field: "minute", range: "0-59", color: "text-cron-minute" },
  { field: "hour", range: "0-23", color: "text-cron-hour" },
  { field: "day of month", range: "1-31", color: "text-cron-dom" },
  { field: "month", range: "1-12", color: "text-cron-month" },
  { field: "day of week", range: "0-6 (Sun-Sat)", color: "text-cron-dow" },
];

export function FieldReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-secondary/50"
      >
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Field Reference
        </h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      
      {isOpen && (
        <div className="border-t border-border px-6 pb-6 pt-4">
          <div className="grid gap-8 sm:grid-cols-2">
            {/* Symbols */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">Symbols</h3>
              <div className="space-y-2">
                {SYMBOLS.map(({ symbol, description }) => (
                  <div key={symbol} className="flex items-center gap-3">
                    <code className="w-8 rounded bg-secondary px-2 py-1 text-center font-mono text-sm text-accent">
                      {symbol}
                    </code>
                    <span className="text-sm text-muted-foreground">{description}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Field Ranges */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">Allowed Ranges</h3>
              <div className="space-y-2">
                {FIELD_RANGES.map(({ field, range, color }) => (
                  <div key={field} className="flex items-center justify-between">
                    <span className={cn("text-sm font-medium", color)}>{field}</span>
                    <code className="font-mono text-sm text-muted-foreground">{range}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
