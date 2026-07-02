/**
 * Optimizer.
 *
 * Normalizes formatting without touching semantics:
 *   - Collapse ≥3 consecutive blank lines to exactly 2.
 *   - Strip trailing whitespace from every line.
 *   - Ensure exactly one trailing newline.
 *   - Normalize line endings to LF.
 *
 * Any change to heading levels, list markers, or textual content is
 * out of scope: the compiler must be predictable and lossless for logic
 * (PRD §4.3 · Predictable, §6 · Optimizer).
 */

export interface OptimizeResult {
  content: string;
}

export function optimize(input: string): OptimizeResult {
  let s = input;

  // 1. Normalize line endings.
  s = s.replace(/\r\n|\r/g, "\n");

  // 2. Strip trailing whitespace per line.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  // 3. Collapse 3+ blank lines to 2.
  s = s.replace(/\n{3,}/g, "\n\n");

  // 4. Trim leading blank lines.
  s = s.replace(/^\n+/, "");

  // 5. Ensure exactly one trailing newline.
  s = s.replace(/\s+$/g, "") + "\n";

  return { content: s };
}
