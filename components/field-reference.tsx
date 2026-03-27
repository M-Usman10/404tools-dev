"use client";

import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const SYMBOLS = [
  { symbol: "*", description: "any value" },
  { symbol: ",", description: "list separator" },
  { symbol: "-", description: "range" },
  { symbol: "/", description: "step" },
];

const FIELD_RANGES = [
  { field: "minute", range: "0-59", colorClass: "bg-cron-minute" },
  { field: "hour", range: "0-23", colorClass: "bg-cron-hour" },
  { field: "day of month", range: "1-31", colorClass: "bg-cron-dom" },
  { field: "month", range: "1-12", colorClass: "bg-cron-month" },
  { field: "day of week", range: "0-6 (Sun-Sat)", colorClass: "bg-cron-dow" },
];

export function FieldReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <h2 className="text-xs font-semibold uppercase tracking-widest">
            Field Reference
          </h2>
        </div>
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary/50 transition-transform duration-300",
          isOpen && "rotate-180"
        )}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
      
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-border px-6 pb-6 pt-5">
            <div className="grid gap-8 sm:grid-cols-2">
              {/* Symbols */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Symbols</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SYMBOLS.map(({ symbol, description }) => (
                    <div 
                      key={symbol} 
                      className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5"
                    >
                      <code className="flex h-7 w-7 items-center justify-center rounded-md bg-background font-mono text-sm font-bold text-accent">
                        {symbol}
                      </code>
                      <span className="text-sm text-muted-foreground">{description}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Field Ranges */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Allowed Ranges</h3>
                <div className="space-y-2">
                  {FIELD_RANGES.map(({ field, range, colorClass }) => (
                    <div 
                      key={field} 
                      className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
                        <span className="text-sm font-medium text-foreground">{field}</span>
                      </div>
                      <code className="rounded-md bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {range}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
