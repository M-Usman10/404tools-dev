"use client";

import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface NextRunsProps {
  runs: Date[];
  isValid: boolean;
}

function formatDate(date: Date): { day: string; time: string } {
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
  
  return {
    day: `${dayName}, ${monthName} ${dayNum}`,
    time: `${hours}:${minutes} ${ampm}`
  };
}

export function NextRuns({ runs, isValid }: NextRunsProps) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <h2 className="text-xs font-semibold uppercase tracking-widest">
          Next 5 Run Times
        </h2>
      </div>
      
      {isValid && runs.length > 0 ? (
        <div className="space-y-2">
          {runs.map((run, index) => {
            const { day, time } = formatDate(run);
            const isNext = index === 0;
            return (
              <div
                key={index}
                className={cn(
                  "group relative flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-all duration-200",
                  isNext
                    ? "bg-accent/10 ring-1 ring-accent/20"
                    : "bg-secondary/50 hover:bg-secondary"
                )}
              >
                {/* Index indicator */}
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isNext 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                
                {/* Date and time */}
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
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-center text-sm text-muted-foreground">
            {isValid ? "No upcoming runs found." : "Enter a valid expression to see run times."}
          </p>
        </div>
      )}
    </div>
  );
}
