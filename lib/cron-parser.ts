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
// Map common patterns to plain English
export function describeExpression(expr: string): string {
  const e = expr.trim();
  const patterns: Record<string, string> = {
    '* * * * *': 'At every minute.',
    '0 * * * *': 'At minute 0 of every hour.',
    '0 0 * * *': 'At midnight every day.',
    '*/5 * * * *': 'Every 5 minutes.',
    '*/15 * * * *': 'Every 15 minutes.',
    '*/30 * * * *': 'Every 30 minutes.',
    '0 9 * * 1-5': 'At 9:00 AM, Monday through Friday.',
    '0 9 * * 1': 'At 9:00 AM, every Monday.',
    '0 0 * * 0': 'At midnight, every Sunday.',
    '0 0 1 * *': 'At midnight, on the 1st of every month.',
  };
  if (patterns[e]) return patterns[e];
  // Fallback: build from parsed fields
  try {
    const { minute, hour, dom, month, dow } = parseCron(e);
    const parts: string[] = [];
    if (minute === '*' && hour === '*') parts.push('every minute');
    else if (minute.startsWith('*/')) parts.push(`every ${minute.slice(2)} minutes`);
    else parts.push(`at ${hour}:${minute.toString().padStart(2, '0')}`);
    if (dow !== '*') parts.push(`on day-of-week ${dow}`);
    if (dom !== '*') parts.push(`on day ${dom} of the month`);
    if (month !== '*') parts.push(`in month ${month}`);
    return parts.join(', ') + '.';
  } catch {
    return 'Invalid expression.';
  }
}
