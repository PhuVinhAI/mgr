/**
 * Line-based MGR Parser.
 *
 * A directive is any line whose first non-whitespace character is `@`,
 * shaped as: `@name [arg...]`. Directives are line-level; they cannot
 * appear inline.
 *
 * `@section <id>` opens a section. A section ends at the next `@section`
 * directive or at EOF. This mirrors Markdown headings but is explicit.
 *
 * `@import <path>` records a dependency on another file, relative to the
 * current file's directory (or to srcDir when starting with `/`).
 *
 * Unknown `@name` directives are surfaced as UNKNOWN_DIRECTIVE by the
 * validator — the parser records them faithfully rather than rejecting
 * them upfront, so Foundation can be extended by future PRDs without
 * touching this file.
 */
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  MgrError,
  type MgrErrorLocation,
} from "../errors/index.js";
import type {
  BlockNode,
  DirectiveNode,
  MarkdownBlockNode,
  MgrDocument,
  SectionNode,
  DirectiveName,
} from "./ast.js";

const KNOWN_DIRECTIVES: ReadonlySet<string> = new Set(["import", "section"]);

const DIRECTIVE_RE = /^(\s*)@([A-Za-z_][A-Za-z0-9_-]*)\b\s*(.*?)\s*$/;

export interface ParseInput {
  /** Absolute file path. */
  file: string;
  /** POSIX-normalized path relative to srcDir. */
  relPath: string;
  /** File content. */
  source: string;
}

/** Read a file and parse it. */
export async function parseFile(
  file: string,
  relPath: string,
): Promise<MgrDocument> {
  let source: string;
  try {
    source = await readFile(file, "utf8");
  } catch (cause) {
    throw new MgrError({
      code: "READ_FAILED",
      messageKey: "READ_FAILED",
      location: { file },
      cause,
    });
  }
  return parseSource({ file, relPath, source });
}

/** Parse a source string into an MgrDocument. */
export function parseSource(input: ParseInput): MgrDocument {
  const { file, relPath, source } = input;
  const lines = splitLines(source);

  const rootBlocks: BlockNode[] = [];
  const imports: DirectiveNode[] = [];
  const sections: SectionNode[] = [];

  // Stack: current section being filled. Top-of-stack is the target
  // container for new blocks. Root uses `rootBlocks`.
  let currentSection: SectionNode | null = null;

  // Accumulator for markdown text.
  let mdBuf: string[] = [];
  let mdStartLine = 1;

  const flushMarkdown = (): void => {
    if (mdBuf.length === 0) return;
    const value = mdBuf.join("\n");
    if (value.trim().length === 0) {
      // Drop pure-whitespace blocks — the bundler/optimizer will
      // reinsert canonical spacing.
      mdBuf = [];
      return;
    }
    const block: MarkdownBlockNode = {
      type: "markdown",
      value,
      location: { line: mdStartLine, column: 1 },
    };
    if (currentSection) currentSection.body.push(block);
    else rootBlocks.push(block);
    mdBuf = [];
  };

  const addBlock = (block: BlockNode): void => {
    if (currentSection) currentSection.body.push(block);
    else rootBlocks.push(block);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const lineNum = i + 1;
    const match = rawLine.match(DIRECTIVE_RE);

    if (!match) {
      if (mdBuf.length === 0) mdStartLine = lineNum;
      mdBuf.push(rawLine);
      continue;
    }

    // We have a directive candidate.
    flushMarkdown();

    const name = (match[2] ?? "").toLowerCase();
    const arg = match[3] ?? "";
    const location = { line: lineNum, column: (match[1]?.length ?? 0) + 1 };

    if (name === "section") {
      const id = arg.trim();
      if (id.length === 0) {
        throw new MgrError({
          code: "DIRECTIVE_SYNTAX",
          messageKey: "DIRECTIVE_SYNTAX_SECTION_MISSING_ID",
          location: locFor(file, location.line),
          directive: "@section",
        });
      }
      if (!isValidSectionId(id)) {
        throw new MgrError({
          code: "DIRECTIVE_SYNTAX",
          messageKey: "DIRECTIVE_SYNTAX_SECTION_INVALID_ID",
          params: { id },
          location: locFor(file, location.line),
          directive: "@section",
        });
      }
      const section: SectionNode = {
        type: "section",
        id,
        location,
        body: [],
      };
      sections.push(section);
      // Sections do not nest in Foundation — a new @section closes the
      // previous one and reopens at root.
      currentSection = section;
      rootBlocks.push(section);
      continue;
    }

    if (name === "import") {
      const target = arg.trim();
      if (target.length === 0) {
        throw new MgrError({
          code: "DIRECTIVE_SYNTAX",
          messageKey: "DIRECTIVE_SYNTAX_IMPORT_MISSING_PATH",
          location: locFor(file, location.line),
          directive: "@import",
        });
      }
      const node: DirectiveNode = {
        type: "directive",
        name: "import" as DirectiveName,
        arg: target,
        location,
      };
      imports.push(node);
      addBlock(node);
      continue;
    }

    // Unknown directive — record but let validator flag it.
    if (!KNOWN_DIRECTIVES.has(name)) {
      const hint = suggestKnownDirective(name);
      throw new MgrError({
        code: "UNKNOWN_DIRECTIVE",
        messageKey: "UNKNOWN_DIRECTIVE",
        params: { name, hint: hint ?? "" },
        location: locFor(file, location.line),
        directive: `@${name}`,
      });
    }
  }

  flushMarkdown();

  return {
    file,
    relPath: toPosix(relPath),
    blocks: rootBlocks,
    imports,
    sections,
  };
}

function splitLines(src: string): string[] {
  // Preserve empty trailing line if present; strip trailing CR for
  // deterministic behavior across platforms.
  return src.split(/\r\n|\r|\n/);
}

function locFor(file: string, line: number): MgrErrorLocation {
  return { file, line };
}

function isValidSectionId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id);
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** Levenshtein-lite suggestion among known directives. */
function suggestKnownDirective(name: string): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const candidate of KNOWN_DIRECTIVES) {
    const d = editDistance(name, candidate);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return bestDist <= 2 ? best : undefined;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j] ?? 0;
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(
        (dp[j] ?? 0) + 1, // deletion
        (dp[j - 1] ?? 0) + 1, // insertion
        prev + cost, // substitution
      );
      prev = tmp;
    }
  }
  return dp[n] ?? 0;
}
