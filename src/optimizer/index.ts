/**
 * Optimizer.
 *
 * Normalizes formatting without touching semantics:
 *   - Strip HTML comments outside fenced code blocks.
 *   - Collapse ≥3 consecutive blank lines to exactly 2.
 *   - Strip trailing whitespace from every line.
 *   - Ensure exactly one trailing newline.
 *   - Normalize line endings to LF.
 *
 * Any change to heading levels, list markers, or textual content is
 * out of scope: the compiler must be predictable and lossless for logic
 * (PRD §4.3 · Predictable, §6 · Optimizer).
 *
 * HTML comment stripping (PSF §16 Prompt Purity).
 *   Author sources use `<!-- ... -->` for PRD citations, gap markers,
 *   and reviewer notes — build-time metadata the runtime LLM has no
 *   reason to read. Stripping them at the optimizer keeps the bundler
 *   "concat verbatim" and does not touch source files. Fenced code
 *   blocks (```...```) are preserved byte-for-byte so a comment shown
 *   inside a documentation example survives.
 */

export interface OptimizeResult {
  content: string;
}

export function optimize(input: string): OptimizeResult {
  let s = input;

  // 1. Normalize line endings.
  s = s.replace(/\r\n|\r/g, "\n");

  // 2. Strip HTML comments outside fenced code blocks.
  s = stripHtmlComments(s);

  // 3. Strip trailing whitespace per line.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  // 4. Collapse 3+ blank lines to 2.
  s = s.replace(/\n{3,}/g, "\n\n");

  // 5. Trim leading blank lines.
  s = s.replace(/^\n+/, "");

  // 6. Ensure exactly one trailing newline.
  s = s.replace(/\s+$/g, "") + "\n";

  return { content: s };
}

/**
 * Remove every `<!-- ... -->` block that lives OUTSIDE a fenced code
 * block. Walks the input line-by-line so a code fence toggles a "keep
 * verbatim" state; comments inside such a fence are examples and stay.
 *
 * Multi-line comments are supported: an opening `<!--` puts the
 * scanner into strip mode until it finds `-->` (possibly many lines
 * later). Lines that become empty after removal are dropped; the
 * blank-line collapse in step 4 handles the resulting whitespace.
 */
function stripHtmlComments(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let inCodeFence = false;
  let inComment = false;

  for (const line of lines) {
    // A fence toggles verbatim mode. The fence line itself is emitted
    // as-is so the fence markers survive. Fences inside an open
    // comment do not toggle — HTML comments have higher precedence.
    if (!inComment && isFenceLine(line)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }
    if (inCodeFence) {
      out.push(line);
      continue;
    }

    const wasInComment = inComment;
    const [stripped, stillOpen] = stripCommentsFromLine(line, inComment);
    inComment = stillOpen;

    // Preserve blank lines that were already blank in the source (no
    // comment activity). Only lines that collapse to whitespace AS A
    // RESULT of stripping are dropped, so multi-line comments do not
    // leave a pile of blank lines behind. Blank-line collapse (step 4)
    // tidies whatever remains.
    const originallyBlank = line.length === 0 || line.trim().length === 0;
    if (originallyBlank && !wasInComment) {
      out.push(line);
      continue;
    }
    if (stripped.trim().length === 0) continue;
    out.push(stripped);
  }

  return out.join("\n");
}

/**
 * Strip every `<!-- ... -->` fragment from a single line. Returns the
 * cleaned line and whether an unterminated comment is still open at
 * the end (so the next line begins in strip mode).
 */
function stripCommentsFromLine(
  line: string,
  startsOpen: boolean,
): [string, boolean] {
  let buf = "";
  let i = 0;
  let open = startsOpen;

  while (i < line.length) {
    if (open) {
      const close = line.indexOf("-->", i);
      if (close < 0) return [buf, true];
      i = close + 3;
      open = false;
      continue;
    }
    const start = line.indexOf("<!--", i);
    if (start < 0) {
      buf += line.slice(i);
      break;
    }
    buf += line.slice(i, start);
    i = start + 4;
    open = true;
  }

  return [buf, open];
}

/**
 * Detect a fenced code block delimiter. Accepts ``` or ~~~ with any
 * indentation of up to three spaces (CommonMark's fence rule).
 */
function isFenceLine(line: string): boolean {
  return /^ {0,3}(```|~~~)/.test(line);
}
