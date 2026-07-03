/**
 * Line-based MGR Parser.
 *
 * A directive is any line whose first non-whitespace character is `@`,
 * shaped as: `@name [arg...]`. Directives are line-level; they cannot
 * appear inline (PRD-002 §6).
 *
 * The parser recognises two shapes of directive:
 *
 * 1. Leaf directives. The handler returns a leaf node (DirectiveNode
 *    or SectionNode) and the parser moves on. `@import` and
 *    `@section` are leaf directives.
 *
 * 2. Block directives. The handler returns a BlockDeclarationNode stub
 *    with an empty body. The parser then collects subsequent lines
 *    into the body until a blank line, another `@`-directive, a `#`-
 *    prefixed heading, end of section, or end of file. The §15a
 *    declarations (@variable, @entity, @formula, @rule, @event,
 *    @action, @auto-action, @query) are block directives.
 *
 * The parser is directive-agnostic: it only recognises the `@name`
 * shape on a line and dispatches to a handler registered in the
 * DirectiveRegistry (PRD-002 §14). Foundation seeds the leaf
 * handlers (`@import`, `@section`); the §15a block handlers ship
 * alongside in the same registry; new directives can be added without
 * touching this file.
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
  BlockDeclarationNode,
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
  const declarations: BlockDeclarationNode[] = [];

  // Top-of-stack is the target container for new blocks. Root uses
  // `rootBlocks` when no @section is open.
  let currentSection: SectionNode | null = null;

  // Open block declaration, if any. While non-null, non-blank,
  // non-directive, non-heading lines are appended to its body.
  let currentDecl: BlockDeclarationNode | null = null;

  let mdBuf: string[] = [];
  let mdStartLine = 1;

  const containerPush = (block: BlockNode): void => {
    if (currentSection) currentSection.body.push(block);
    else rootBlocks.push(block);
  };

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
    containerPush(block);
    mdBuf = [];
  };

  /**
   * Close the open block declaration, recording it in the AST and
   * the document's flat declaration list. After this call,
   * `currentDecl` is null and the parser resumes normal mode.
   */
  const closeDeclaration = (): void => {
    if (!currentDecl) return;
    const decl = currentDecl;
    // Trim trailing blank lines from the body that may have been
    // captured when the source used indented continuation; the body
    // contract is "no leading or trailing blank lines".
    while (decl.body.length > 0 && decl.body.endsWith("\n")) {
      decl.body = decl.body.slice(0, -1);
      decl.bodyLines.pop();
    }
    containerPush(decl);
    declarations.push(decl);
    currentDecl = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const lineNum = i + 1;
    const match = rawLine.match(DIRECTIVE_RE);

    if (!match) {
      // Non-directive line. Inside an open block declaration, append
      // to its body. The body terminates only at the next `@`-directive
      // or a markdown heading; blank lines are part of the body so the
      // author can separate field paragraphs (e.g. a Purpose block
      // after an HTML comment) without losing the declaration.
      if (currentDecl) {
        const trimmed = rawLine.trim();
        if (trimmed.startsWith("#")) {
          closeDeclaration();
          // Fall through to record the heading as markdown.
        } else {
          currentDecl.body =
            currentDecl.body.length === 0
              ? rawLine
              : `${currentDecl.body}\n${rawLine}`;
          currentDecl.bodyLines.push({ line: lineNum, column: 1 });
          continue;
        }
      }
      if (mdBuf.length === 0) mdStartLine = lineNum;
      mdBuf.push(rawLine);
      continue;
    }

    // Directive candidate: closes any open block declaration and
    // any pending markdown buffer before dispatching.
    closeDeclaration();
    flushMarkdown();

    const name = (match[2] ?? "").toLowerCase();
    const arg = match[3] ?? "";
    const indent = match[1]?.length ?? 0;
    const location = { line: lineNum, column: indent + 1 };

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

    if (node.type === "declaration") {
      // Block directive: the handler returned a stub with body="".
      // The parser continues collecting body lines until a blank
      // line, another directive, a heading, or end-of-section.
      currentDecl = node;
      continue;
    }

    // Leaf directive node. `@import` is tracked in the imports list
    // so the graph builder can consume it.
    containerPush(node);
    if (node.name === "import") {
      imports.push(node);
    }
  }

  closeDeclaration();
  flushMarkdown();

  return {
    file,
    relPath: toPosix(relPath),
    blocks: rootBlocks,
    imports,
    sections,
    declarations,
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
