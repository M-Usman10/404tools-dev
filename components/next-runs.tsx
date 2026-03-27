"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextRunsProps {
  runs: Date[];
  isValid: boolean;
}

// Format a Date object into day and time strings

function formatDate(date: Date): { day: string; time: string } {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return {
    day: `${dayName}, ${monthName} ${dayNum}`,
    time: `${hours}:${minutes} ${ampm}`,
  };
}

export function NextRuns({ runs, isValid }: NextRunsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const showRuns = mounted && isValid && runs.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <h2 className="text-xs font-semibold uppercase tracking-widest">
          Next 5 Run Times
        </h2>
      </div>

      {showRuns ? (
        <div className="space-y-1.5">
          {runs.map((run, index) => {
            const { day, time } = formatDate(run);
            const isNext = index === 0;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  isNext
                    ? "bg-accent/10 ring-1 ring-accent/20"
                    : "bg-secondary/50 hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  isNext
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isNext ? "text-foreground" : "text-secondary-foreground"
                  )}>
                    {day}
                  </span>
                  <span className={cn(
                    "font-mono text-sm tabular-nums",
                    isNext ? "text-accent" : "text-muted-foreground"
                  )}>
                    {time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center">
          <p className="text-center text-sm text-muted-foreground">
            {!mounted
              ? "Loading run times..."
              : isValid
              ? "No upcoming runs found."
              : "Enter a valid expression to see run times."}
          </p>
        </div>
      )}
    </div>
  );
}
