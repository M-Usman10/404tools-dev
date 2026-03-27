"use client";

import { cn } from "@/lib/utils";

interface HumanReadableProps {
  description: string | null;
  isValid: boolean;
}

export function HumanReadable({ description, isValid }: HumanReadableProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Human Readable
      </h2>
      <p
        className={cn(
          "text-xl font-medium sm:text-2xl",
          isValid ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {isValid && description ? description : "Invalid expression."}
      </p>
    </div>
  );
}
