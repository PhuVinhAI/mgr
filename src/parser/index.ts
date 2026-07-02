/**
 * Line-based MGR Parser.
 *
 * A directive is any line whose first non-whitespace character is `@`,
 * shaped as: `@name [arg...]`. Directives are line-level; they cannot
 * appear inline (PRD-002 §6).
 *
 * The parser is directive-agnostic: it only recognizes the shape and
 * dispatches to a handler registered in the DirectiveRegistry
 * (PRD-002 §14). Foundation seeds `@import` and `@section` handlers;
 * new directives can be added without touching this file.
 *
 * Error handling:
 *   - Unknown directive → UNKNOWN_DIRECTIVE with "did you mean" hint.
 *   - Reserved directive (PRD-002 §11) → DIRECTIVE_RESERVED.
 *   - Syntax problems inside a handler → DIRECTIVE_SYNTAX.
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
} from "./ast.js";
import {
  createFoundationRegistry,
  DirectiveRegistry,
} from "./directives.js";

const DIRECTIVE_RE = /^(\s*)@([A-Za-z_][A-Za-z0-9_-]*)\b\s*(.*?)\s*$/;

export interface ParseInput {
  /** Absolute file path. */
  file: string;
  /** POSIX-normalized path relative to srcDir. */
  relPath: string;
  /** File content. */
  source: string;
  /** Directive registry. Defaults to the Foundation registry. */
  registry?: DirectiveRegistry;
}

/** Read a file and parse it. */
export async function parseFile(
  file: string,
  relPath: string,
  registry?: DirectiveRegistry,
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
  return parseSource({
    file,
    relPath,
    source,
    ...(registry ? { registry } : {}),
  });
}

/** Parse a source string into an MgrDocument. */
export function parseSource(input: ParseInput): MgrDocument {
  const { file, relPath, source } = input;
  const registry = input.registry ?? createFoundationRegistry();
  const lines = splitLines(source);

  const rootBlocks: BlockNode[] = [];
  const imports: DirectiveNode[] = [];
  const sections: SectionNode[] = [];

  // Top-of-stack is the target container for new blocks. Root uses
  // `rootBlocks` when no @section is open.
  let currentSection: SectionNode | null = null;

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

    const def = registry.get(name);
    if (!def) {
      // Reserved names get a dedicated error so a future PRD can add
      // semantics without a breaking change.
      if (registry.isReserved(name)) {
        throw new MgrError({
          code: "DIRECTIVE_RESERVED",
          messageKey: "DIRECTIVE_RESERVED",
          params: { name },
          location: locFor(file, location.line),
          directive: `@${name}`,
        });
      }
      const hint = registry.suggest(name);
      throw new MgrError({
        code: "UNKNOWN_DIRECTIVE",
        messageKey: "UNKNOWN_DIRECTIVE",
        params: { name, hint: hint ?? "" },
        location: locFor(file, location.line),
        directive: `@${name}`,
      });
    }

    const node = def.handler({
      file,
      relPath,
      arg,
      location,
    });

    if (node.type === "section") {
      // Sections do not nest in Foundation — a new @section closes
      // the previous one and reopens at root.
      sections.push(node);
      currentSection = node;
      rootBlocks.push(node);
      continue;
    }

    // Directive node. `@import` gets tracked in the imports list so
    // the graph builder can consume it.
    addBlock(node);
    if (node.name === "import") {
      imports.push(node);
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
  return src.split(/\r\n|\r|\n/);
}

function locFor(file: string, line: number): MgrErrorLocation {
  return { file, line };
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}
