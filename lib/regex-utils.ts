// Regex utility functions

export interface RegexResult {
  regex: RegExp | null;
  error: string | null;
}

export interface Match {
  index: number;
  end: number;
  value: string;
  groups: string[];
  namedGroups: Record<string, string>;
}

// Step 1: Build RegExp safely
export function buildRegex(pattern: string, flags: string): RegexResult {
  try {
    return { regex: new RegExp(pattern, flags), error: null };
  } catch (e) {
    return { regex: null, error: e instanceof Error ? e.message : "Invalid regex" };
  }
}

// Step 2: Get all matches with full details
export function getMatches(regex: RegExp, testString: string): Match[] {
  const matches: Match[] = [];
  let m;
  const r = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : regex.flags + "g"
  );
  
  let prevIndex = -1;
  while ((m = r.exec(testString)) !== null) {
    // Prevent infinite loop on zero-length matches
    if (m.index === prevIndex) {
      r.lastIndex++;
      continue;
    }
    prevIndex = m.index;
    
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      value: m[0],
      groups: m.slice(1),
      namedGroups: m.groups || {},
    });
    if (!regex.flags.includes("g")) break;
  }
  return matches;
}

// Step 3: Escape HTML for safe rendering
export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Step 4: Build highlighted HTML from matches
export function buildHighlightedHTML(str: string, matches: Match[]): string {
  if (!matches.length) return escapeHTML(str);
  
  let result = "";
  let cursor = 0;
  
  for (const match of matches) {
    result += escapeHTML(str.slice(cursor, match.index));
    result += `<mark class="match">${escapeHTML(match.value)}</mark>`;
    cursor = match.end;
  }
  
  result += escapeHTML(str.slice(cursor));
  return result;
}

// Step 5: Apply replacement
export function applyReplace(
  regex: RegExp,
  testString: string,
  replacement: string
): string {
  try {
    return testString.replace(regex, replacement);
  } catch (e) {
    return "Invalid replacement: " + (e instanceof Error ? e.message : "Unknown error");
  }
}

// Convert Python regex syntax to JS where possible
export function pythonToJS(pattern: string): { pattern: string; warnings: string[] } {
  const warnings: string[] = [];
  let converted = pattern;
  
  // Named groups: (?P<name>...) -> (?<name>...)
  converted = converted.replace(/\(\?P<(\w+)>/g, "(?<$1>");
  
  // \A -> ^ (start of string)
  if (converted.includes("\\A")) {
    converted = converted.replace(/\\A/g, "^");
    warnings.push("\\A converted to ^ (JS equivalent)");
  }
  
  // \Z -> $ (end of string)
  if (converted.includes("\\Z")) {
    converted = converted.replace(/\\Z/g, "$");
    warnings.push("\\Z converted to $ (JS equivalent)");
  }
  
  return { pattern: converted, warnings };
}

// Cheatsheet data
export const cheatsheet = {
  characters: [
    { token: ".", desc: "any character" },
    { token: "\\d", desc: "digit [0-9]" },
    { token: "\\D", desc: "non-digit" },
    { token: "\\w", desc: "word char [a-zA-Z0-9_]" },
    { token: "\\W", desc: "non-word" },
    { token: "\\s", desc: "whitespace" },
    { token: "\\S", desc: "non-whitespace" },
    { token: "\\b", desc: "word boundary" },
    { token: "\\n", desc: "newline" },
    { token: "\\t", desc: "tab" },
  ],
  quantifiers: [
    { token: "*", desc: "0 or more" },
    { token: "+", desc: "1 or more" },
    { token: "?", desc: "0 or 1" },
    { token: "{n}", desc: "exactly n" },
    { token: "{n,}", desc: "n or more" },
    { token: "{n,m}", desc: "between n and m" },
    { token: "*?", desc: "lazy 0 or more" },
    { token: "+?", desc: "lazy 1 or more" },
  ],
  groups: [
    { token: "(abc)", desc: "capture group" },
    { token: "(?:abc)", desc: "non-capturing" },
    { token: "(?<name>abc)", desc: "named group" },
    { token: "(?=abc)", desc: "lookahead" },
    { token: "(?!abc)", desc: "negative lookahead" },
    { token: "^", desc: "start of string" },
    { token: "$", desc: "end of string" },
    { token: "[abc]", desc: "character class" },
    { token: "[^abc]", desc: "negated class" },
    { token: "a|b", desc: "alternation" },
  ],
};
