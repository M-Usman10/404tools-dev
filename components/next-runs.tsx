"use client";

import { cn } from "@/lib/utils";

interface NextRunsProps {
  runs: Date[];
  isValid: boolean;
}

function formatDate(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  
  return `${dayName}, ${monthName} ${dayNum} · ${hours}:${minutes} ${ampm}`;
}

export function NextRuns({ runs, isValid }: NextRunsProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Next 5 Run Times
      </h2>
      {isValid && runs.length > 0 ? (
        <div className="space-y-2">
          {runs.map((run, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 rounded-md px-4 py-3 font-mono text-sm transition-colors sm:text-base",
                index === 0
                  ? "bg-accent/20 text-accent"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <span className="text-muted-foreground">{index + 1}.</span>
              <span>{formatDate(run)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {isValid ? "No upcoming runs found." : "Enter a valid expression to see run times."}
        </p>
      )}
    </div>
  );
}
