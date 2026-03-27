"use client";

import { cn } from "@/lib/utils";

interface WeeklyHeatmapProps {
  heatmap: boolean[][];
  isValid: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeeklyHeatmap({ heatmap, isValid }: WeeklyHeatmapProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Weekly Heatmap
      </h2>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header row with day labels */}
          <div className="mb-2 grid grid-cols-[40px_repeat(7,1fr)] gap-1">
            <div /> {/* Empty corner cell */}
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Hour rows */}
          <div className="space-y-1">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[40px_repeat(7,1fr)] gap-1"
              >
                {/* Hour label */}
                <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                
                {/* Day cells for this hour */}
                {DAYS.map((_, dayIndex) => {
                  const isActive = isValid && heatmap[dayIndex]?.[hour];
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "h-4 rounded-sm transition-colors",
                        isActive
                          ? "bg-accent shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                          : "bg-secondary"
                      )}
                      title={
                        isActive
                          ? `Fires on ${DAYS[dayIndex]} at ${hour.toString().padStart(2, "0")}:00`
                          : `No fire on ${DAYS[dayIndex]} at ${hour.toString().padStart(2, "0")}:00`
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
      <div className="mt-4 flex items-center justify-end gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-secondary" />
          <span>No fire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-accent shadow-[0_0_6px_rgba(168,85,247,0.4)]" />
          <span>Fires</span>
        </div>
      </div>
    </div>
  );
}
