// Cron expression parser and utilities

export interface ParsedCron {
  minute: string;
  hour: string;
  dom: string;
  month: string;
  dow: string;
}

// Step 1: Split and validate
// A valid cron has exactly 5 space-separated fields.
export function parseCron(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Must have exactly 5 fields");
  const [minute, hour, dom, month, dow] = fields;
  return { minute, hour, dom, month, dow };
}

// Step 2: Parse a single field into a Set of matching values
// Supports: * | */step | value | range (start-end) | list (a,b,c) | combinations
function parseField(field: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  const parts = field.split(',');
  for (const part of parts) {
    if (part === '*') {
      for (let i = min; i <= max; i++) result.add(i);
    } else if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2));
      for (let i = min; i <= max; i += step) result.add(i);
    } else if (part.includes('/')) {
      const [range, step] = part.split('/');
      const [start, end] = range.includes('-')
        ? range.split('-').map(Number)
        : [Number(range), max];
      for (let i = start; i <= end; i += Number(step)) result.add(i);
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) result.add(i);
    } else {
      result.add(parseInt(part));
    }
  }
  return result;
}

// Step 3: Check if a given Date matches the cron expression
function matchesCron(date: Date, parsed: ParsedCron): boolean {
  const minutes = parseField(parsed.minute, 0, 59);
  const hours = parseField(parsed.hour, 0, 23);
  const doms = parseField(parsed.dom, 1, 31);
  const months = parseField(parsed.month, 1, 12);
  const dows = parseField(parsed.dow, 0, 6);
  return (
    minutes.has(date.getMinutes()) &&
    hours.has(date.getHours()) &&
    doms.has(date.getDate()) &&
    months.has(date.getMonth() + 1) &&
    dows.has(date.getDay())
  );
}

// Step 4: Compute next N run times
// Start from current time + 1 minute, iterate minute by minute
export function getNextRuns(expr: string, n: number = 5): Date[] {
  const parsed = parseCron(expr);
  const runs: Date[] = [];
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  while (runs.length < n) {
    if (matchesCron(d, parsed)) runs.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
    if (d.getFullYear() > new Date().getFullYear() + 2) break; // safety
  }
  return runs;
}

// Step 5: Build weekly heatmap data
// Returns a 7x24 boolean grid: grid[dayOfWeek][hour] = true if cron fires
// Simulate a full week starting from the most recent Sunday at 00:00
export function getWeeklyHeatmap(expr: string): boolean[][] {
  const parsed = parseCron(expr);
  const grid: boolean[][] = Array.from({ length: 7 }, () => Array(24).fill(false));
  // Find the most recent Sunday
  const start = new Date();
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  // Iterate every minute of the week (7 * 24 * 60 = 10,080 iterations)
  const d = new Date(start);
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min++) {
        d.setDate(start.getDate() + day);
        d.setHours(hour, min, 0, 0);
        if (matchesCron(d, parsed)) {
          grid[day][hour] = true;
          break; // one match per hour slot is enough
        }
      }
    }
  }
  return grid; // grid[0] = Sunday, grid[6] = Saturday
}

// Step 6: Generate human-readable description
export function describeExpression(expr: string): string {
  try {
    const { minute, hour, dom, month, dow } = parseCron(expr);

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Helper to format time
    const formatTime = (h: number, m: number): string => {
      const period = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      const minStr = m.toString().padStart(2, "0");
      return `${hour12}:${minStr} ${period}`;
    };

    // Helper to get ordinal suffix
    const ordinal = (n: number): string => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Helper to describe a field value
    const describeFieldValues = (vals: Set<number>, names?: string[]): string => {
      const arr = Array.from(vals).sort((a, b) => a - b);
      if (names) {
        return arr.map(v => names[v]).join(", ");
      }
      return arr.join(", ");
    };

    // Helper to detect if field is a step pattern
    const isStep = (field: string): { step: number; base: number } | null => {
      if (field.startsWith("*/")) {
        return { step: parseInt(field.slice(2)), base: 0 };
      }
      return null;
    };

    // Helper to detect if field is a range
    const isRange = (field: string): { start: number; end: number } | null => {
      if (field.includes("-") && !field.includes(",") && !field.includes("/")) {
        const [s, e] = field.split("-").map(Number);
        return { start: s, end: e };
      }
      return null;
    };

    // Parse values for each field
    const minutes = parseField(minute, 0, 59);
    const hours = parseField(hour, 0, 23);
    const doms = parseField(dom, 1, 31);
    const months = parseField(month, 1, 12);
    const dows = parseField(dow, 0, 6);

    const parts: string[] = [];

    // TIME DESCRIPTION
    const minStep = isStep(minute);
    const hourStep = isStep(hour);

    if (minute === "*" && hour === "*") {
      parts.push("Every minute");
    } else if (minStep && hour === "*") {
      if (minStep.step === 1) {
        parts.push("Every minute");
      } else {
        parts.push(`Every ${minStep.step} minutes`);
      }
    } else if (minute === "0" && hourStep) {
      if (hourStep.step === 1) {
        parts.push("Every hour");
      } else {
        parts.push(`Every ${hourStep.step} hours`);
      }
    } else if (minute === "0" && hour === "*") {
      parts.push("Every hour, at minute 0");
    } else if (minutes.size === 1 && hours.size === 1) {
      const h = Array.from(hours)[0];
      const m = Array.from(minutes)[0];
      parts.push(`At ${formatTime(h, m)}`);
    } else if (minutes.size === 1 && hours.size > 1) {
      const m = Array.from(minutes)[0];
      const hourList = Array.from(hours).map(h => formatTime(h, m)).join(", ");
      parts.push(`At ${hourList}`);
    } else if (minutes.size > 1 && hours.size === 1) {
      const h = Array.from(hours)[0];
      const minList = Array.from(minutes).map(m => formatTime(h, m)).join(", ");
      parts.push(`At ${minList}`);
    } else {
      // Complex time pattern
      const minDesc = minute === "*" ? "every minute" : `minute ${describeFieldValues(minutes)}`;
      const hourDesc = hour === "*" ? "every hour" : `hour ${describeFieldValues(hours)}`;
      parts.push(`At ${minDesc} past ${hourDesc}`);
    }

    // DAY OF WEEK DESCRIPTION
    const dowRange = isRange(dow);
    if (dow !== "*") {
      if (dowRange) {
        parts.push(`${dayNames[dowRange.start]} through ${dayNames[dowRange.end]}`);
      } else if (dows.size === 1) {
        parts.push(`on ${dayNames[Array.from(dows)[0]]}`);
      } else if (dows.size === 5 && !dows.has(0) && !dows.has(6)) {
        parts.push("on weekdays");
      } else if (dows.size === 2 && dows.has(0) && dows.has(6)) {
        parts.push("on weekends");
      } else {
        parts.push(`on ${describeFieldValues(dows, dayNames)}`);
      }
    }

    // DAY OF MONTH DESCRIPTION
    if (dom !== "*") {
      if (doms.size === 1) {
        parts.push(`on the ${ordinal(Array.from(doms)[0])}`);
      } else {
        const domList = Array.from(doms).map(d => ordinal(d)).join(", ");
        parts.push(`on the ${domList}`);
      }
    }

    // MONTH DESCRIPTION
    if (month !== "*") {
      if (months.size === 1) {
        parts.push(`in ${monthNames[Array.from(months)[0] - 1]}`);
      } else {
        const monthList = Array.from(months).map(m => monthNames[m - 1]).join(", ");
        parts.push(`in ${monthList}`);
      }
    }

    // Join parts naturally
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // If part starts with "on" or "in", add comma
      if (part.startsWith("on ") || part.startsWith("in ")) {
        result += ", " + part;
      } else {
        result += ", " + part;
      }
    }

    return result + ".";
  } catch {
    return "Invalid expression.";
  }
}


