"use client";

import { cn } from "@/lib/utils";
import { Grid3X3 } from "lucide-react";

interface WeeklyHeatmapProps {
  heatmap: boolean[][];
  isValid: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeeklyHeatmap({ heatmap, isValid }: WeeklyHeatmapProps) {
  // Count active cells for legend
  const activeCount = heatmap.flat().filter(Boolean).length;
  
  return (
    <div className="h-full rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Grid3X3 className="h-4 w-4" />
          <h2 className="text-xs font-semibold uppercase tracking-widest">
            Weekly Heatmap
          </h2>
        </div>
        {isValid && (
          <span className="text-xs text-muted-foreground">
            {activeCount} active {activeCount === 1 ? "slot" : "slots"}
          </span>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Header row with day labels */}
          <div className="mb-1.5 grid grid-cols-[32px_repeat(7,1fr)] gap-0.5">
            <div /> {/* Empty corner cell */}
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Hour rows - showing every 3 hours for cleaner display */}
          <div className="space-y-0.5">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[32px_repeat(7,1fr)] gap-0.5"
              >
                {/* Hour label - only show for certain hours */}
                <div className="flex items-center justify-end pr-1.5 text-[9px] tabular-nums text-muted-foreground/70">
                  {hour % 6 === 0 ? `${hour.toString().padStart(2, "0")}:00` : ""}
                </div>
                
                {/* Day cells for this hour */}
                {DAYS.map((_, dayIndex) => {
                  const isActive = isValid && heatmap[dayIndex]?.[hour];
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "h-2.5 rounded-[2px] transition-all duration-150",
                        isActive
                          ? "bg-accent shadow-[0_0_6px_var(--glow-accent)]"
                          : "bg-secondary/60"
                      )}
                      title={
                        isActive
                          ? `Fires: ${DAYS[dayIndex]} at ${hour.toString().padStart(2, "0")}:00`
                          : `No fire: ${DAYS[dayIndex]} at ${hour.toString().padStart(2, "0")}:00`
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-4 border-t border-border/50 pt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-[2px] bg-secondary/60" />
          <span>Inactive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-[2px] bg-accent shadow-[0_0_4px_var(--glow-accent)]" />
          <span>Active</span>
        </div>
      </div>
    </div>
  );
}
