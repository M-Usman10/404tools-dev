"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface HumanReadableProps {
  description: string | null;
  isValid: boolean;
}

export function HumanReadable({ description, isValid }: HumanReadableProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8">
      {/* Subtle accent gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-transparent" />
      
      <div className="relative">
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <h2 className="text-xs font-semibold uppercase tracking-widest">
            Human Readable
          </h2>
        </div>
        <p
          className={cn(
            "text-pretty text-xl font-medium leading-relaxed sm:text-2xl lg:text-3xl",
            isValid ? "text-foreground" : "text-muted-foreground/60"
          )}
        >
          {isValid && description ? (
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {description}
            </span>
          ) : (
            "Enter a valid expression to see description."
          )}
        </p>
      </div>
    </div>
  );
}
