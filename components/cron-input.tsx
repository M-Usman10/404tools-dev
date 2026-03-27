"use client";

import { cn } from "@/lib/utils";

const FIELD_CONFIG = [
  { label: "minute", color: "bg-cron-minute", range: "0-59" },
  { label: "hour", color: "bg-cron-hour", range: "0-23" },
  { label: "day of month", color: "bg-cron-dom", range: "1-31" },
  { label: "month", color: "bg-cron-month", range: "1-12" },
  { label: "day of week", color: "bg-cron-dow", range: "0-6" },
];

interface CronInputProps {
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
  error: string | null;
  parsed: { minute: string; hour: string; dom: string; month: string; dow: string } | null;
}

export function CronInput({ value, onChange, isValid, error, parsed }: CronInputProps) {
  const fields = value.trim().split(/\s+/);
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border bg-input px-6 py-5 font-mono text-2xl text-foreground transition-colors focus:outline-none focus:ring-2 sm:text-3xl",
            isValid
              ? "border-border focus:ring-ring"
              : "border-destructive focus:ring-destructive"
          )}
          placeholder="* * * * *"
          spellCheck={false}
          autoComplete="off"
        />
        {!isValid && error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>
      
      {/* Field badges aligned under input */}
      <div className="flex justify-center">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {FIELD_CONFIG.map((field, index) => {
            const fieldValue = fields[index] || "";
            return (
              <div key={field.label} className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-sm text-muted-foreground sm:text-base">
                  {fieldValue || "—"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium text-background sm:px-3 sm:py-1 sm:text-sm",
                    field.color
                  )}
                >
                  {field.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
