"use client";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

const FIELD_CONFIG = [
  { label: "minute", colorClass: "bg-cron-minute", textColor: "text-cron-minute" },
  { label: "hour", colorClass: "bg-cron-hour", textColor: "text-cron-hour" },
  { label: "day of month", colorClass: "bg-cron-dom", textColor: "text-cron-dom" },
  { label: "month", colorClass: "bg-cron-month", textColor: "text-cron-month" },
  { label: "day of week", colorClass: "bg-cron-dow", textColor: "text-cron-dow" },
];

interface CronInputProps {
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
  error: string | null;
  parsed: { minute: string; hour: string; dom: string; month: string; dow: string } | null;
}

export function CronInput({ value, onChange, isValid, error }: CronInputProps) {
  const fields = value.trim().split(/\s+/);
  
  return (
    <div className="space-y-6">
      {/* Input container with subtle glow on focus */}
      <div className="group relative">
        <div 
          className={cn(
            "absolute -inset-0.5 rounded-xl opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100",
            isValid ? "bg-accent/20" : "bg-destructive/20"
          )} 
        />
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full rounded-xl border-2 bg-card px-6 py-6 font-mono text-2xl tracking-widest text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:outline-none sm:text-3xl lg:text-4xl",
              isValid
                ? "border-border focus:border-accent/50"
                : "border-destructive/50 focus:border-destructive"
            )}
            placeholder="* * * * *"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        
        {/* Error message */}
        {!isValid && error && (
          <div className="mt-3 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
      
      {/* Field badges aligned under input */}
      <div className="flex justify-center px-4">
        <div className="grid w-full max-w-2xl grid-cols-5 gap-1 sm:gap-3">
          {FIELD_CONFIG.map((field, index) => {
            const fieldValue = fields[index] || "";
            const hasValue = fieldValue && fieldValue !== "";
            return (
              <div key={field.label} className="flex flex-col items-center gap-2">
                {/* Field value */}
                <div 
                  className={cn(
                    "flex h-10 w-full items-center justify-center rounded-lg border bg-card font-mono text-sm transition-all sm:text-base",
                    hasValue 
                      ? `border-border ${field.textColor}` 
                      : "border-border/50 text-muted-foreground/50"
                  )}
                >
                  {fieldValue || "—"}
                </div>
                {/* Field label badge */}
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-background sm:px-3 sm:text-xs",
                    field.colorClass
                  )}
                >
                  <span className="hidden sm:inline">{field.label}</span>
                  <span className="sm:hidden">{field.label.split(" ")[0].slice(0, 3)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
