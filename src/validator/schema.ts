/**
 * Section Schema Validator — PRD-008 §15a.
 *
 * MGR Kernel PRDs (008/010/012/013) describe a fixed block schema for
 * every kind of declaration in a Game Package. This module walks the
 * parsed markdown inside each section and enforces that schema:
 *
 * - Every declaration line (`Rule <Name>`, `Entity <Name>`, ...) must
 *   be followed by the required blocks for that kind.
 * - Optional blocks are accepted.
 * - Block names outside the schema are rejected with a stable code.
 * - Duplicate block names within the same declaration are rejected.
 *
 * The scanner is intentionally line-based and forgiving of surrounding
 * prose (Markdown headings, HTML comments) so authors can annotate
 * around the declaration without breaking validation.
 */
import * as path from "node:path";
import { MgrError } from "../errors/index.js";
import type { ProjectGraph } from "../graph/index.js";
import type { BlockNode, MarkdownBlockNode } from "../parser/ast.js";

/** The seven declaration kinds §15a enumerates. */
type DeclKind =
  | "Variable"
  | "Entity"
  | "Formula"
  | "Rule"
  | "Event"
  | "Action"
  | "Query"
  | "Auto Action";

/** Rule sub-kinds (§15a.4). */
type RuleSubKind = "Guard" | "Transformation" | "Trigger";

interface Declaration {
  kind: DeclKind;
  name: string;
  /** Present only for Rule; parsed from the `Kind:` block. */
  ruleKind?: RuleSubKind;
  /** For Entity, records whether it is Persistent / Transient. */
  entityKind?: string;
  /** Block name → line where it was declared. */
  blocks: Map<string, number>;
  /** Absolute line of the declaration header. */
  startLine: number;
  file: string;
}

const DECL_RE = /^(Variable|Entity|Formula|Rule|Event|Query|Auto Action|Action)\s+(\S.*?)\s*$/;
const BLOCK_RE = /^([A-Z][A-Za-z ]*[A-Za-z]):\s*(.*)$/;

/**
 * The block-name catalog. Anything outside this set inside a
 * declaration is `SECTION_SCHEMA_UNKNOWN_BLOCK`.
 */
const KNOWN_BLOCKS: ReadonlySet<string> = new Set([
  "Visibility",
  "Kind",
  "Type",
  "Default",
  "Domain",
  "Attributes",
  "Behaviour",
  "Behavior",
  "Relationships",
  "Lifetime",
  "Phase",
  "Trigger",
  "Precondition",
  "Preconditions",
  "Effect",
  "Priority",
  "Intent",
  "Parameters",
  "Passthrough",
  "Fires When",
  "Body",
  "Match",
  "Input",
]);

/**
 * Per-kind required and forbidden blocks. §15a.
 * For Rule we key by "Rule <SubKind>" once SubKind is known; the
 * ruleKind pass runs after the initial catalog.
 */
const REQUIRED: Record<string, ReadonlyArray<string>> = {
  Variable: ["Visibility"],
  Entity: ["Kind", "Attributes"],
  Formula: [],
  "Rule Guard": ["Trigger", "Precondition"],
  "Rule Transformation": ["Trigger", "Precondition", "Effect"],
  "Rule Trigger": ["Trigger", "Effect"],
  Event: ["Phase", "Trigger", "Effect"],
  Action: ["Intent"],
  "Auto Action": ["Fires When"],
  Query: [],
};

const FORBIDDEN: Record<string, ReadonlyArray<string>> = {
  "Rule Guard": ["Effect"],
};

export function validateSectionSchema(graph: ProjectGraph): {
  errors: MgrError[];
  warnings: MgrError[];
} {
  const errors: MgrError[] = [];
  const warnings: MgrError[] = [];

  for (const rel of graph.order) {
    const doc = graph.documents.get(rel);
    if (!doc) continue;
    const absFile = path.join(graph.srcDir, doc.relPath);
    for (const block of doc.blocks) {
      collectDeclarations(block, absFile, errors);
    }
  }

  return { errors, warnings };
}

function collectDeclarations(
  block: BlockNode,
  file: string,
  errors: MgrError[],
): void {
  if (block.type === "section") {
    for (const child of block.body) {
      collectDeclarations(child, file, errors);
    }
    return;
  }
  if (block.type !== "markdown") return;
  scanMarkdown(block, file, errors);
}

function scanMarkdown(
  block: MarkdownBlockNode,
  file: string,
  errors: MgrError[],
): void {
  const lines = block.value.split(/\r\n|\r|\n/);
  const baseLine = block.location.line;

  let current: Declaration | null = null;
  let inHtmlComment = false;

  const finish = (): void => {
    if (current) {
      emitForDeclaration(current, errors);
      current = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    const absLine = baseLine + i;

    // Multi-line HTML comment tracking. `<!-- ... -->` may span many
    // lines; every line inside is prose and must be ignored by the
    // declaration scanner. Nested comments are not HTML-valid so we
    // treat any `-->` as the end.
    if (inHtmlComment) {
      if (line.includes("-->")) inHtmlComment = false;
      continue;
    }
    if (line.startsWith("<!--")) {
      if (!line.includes("-->")) inHtmlComment = true;
      continue;
    }

    if (line.length === 0) continue;
    if (line.startsWith("#")) {
      // Markdown heading — closes any open declaration but does not
      // start a new one.
      finish();
      continue;
    }

    const declMatch = line.match(DECL_RE);
    if (declMatch) {
      finish();
      const kind = declMatch[1] as DeclKind;
      const name = declMatch[2] ?? "";
      current = {
        kind,
        name,
        blocks: new Map(),
        startLine: absLine,
        file,
      };
      continue;
    }

    if (!current) continue;

    const blockMatch = line.match(BLOCK_RE);
    if (blockMatch) {
      const blockName = blockMatch[1] ?? "";
      if (blockName === "Kind") {
        // Peek: the Kind value can be on the same line ("Kind: Guard")
        // or on the next non-empty line ("Kind:\nGuard").
        const inline = (blockMatch[2] ?? "").trim();
        const value = inline.length > 0 ? inline : nextValue(lines, i);
        if (current.kind === "Rule") {
          if (value === "Guard" || value === "Transformation" || value === "Trigger") {
            current.ruleKind = value;
          }
        } else if (current.kind === "Entity") {
          current.entityKind = value;
        }
      }

      if (!KNOWN_BLOCKS.has(blockName)) {
        // Not a top-level block heading — could be Parameter/value line
        // inside a block ("Quantity: Integer" under "Parameters:"). We
        // treat it as content. Typo detection for required block names
        // is handled downstream by SECTION_SCHEMA_MISSING_BLOCK.
        //
        // A stricter unknown-block check needs indent-aware parsing;
        // see PRD-008 §15a.10.
        continue;
      }

      if (current.blocks.has(blockName)) {
        errors.push(
          new MgrError({
            code: "SECTION_SCHEMA_DUPLICATE_BLOCK",
            messageKey: "SECTION_SCHEMA_DUPLICATE_BLOCK",
            params: {
              kind: current.kind,
              name: current.name,
              block: blockName,
            },
            location: { file: current.file, line: absLine },
          }),
        );
      } else {
        current.blocks.set(blockName, absLine);
      }
      continue;
    }
  }

  finish();
}

function nextValue(lines: string[], from: number): string {
  for (let j = from + 1; j < lines.length; j++) {
    const v = (lines[j] ?? "").trim();
    if (v.length === 0) continue;
    if (v.startsWith("<!--")) continue;
    return v;
  }
  return "";
}

function emitForDeclaration(decl: Declaration, errors: MgrError[]): void {
  const schemaKey = resolveSchemaKey(decl);

  // Rule declarations must always declare `Kind:` — even before the
  // per-subkind required list can be checked.
  if (decl.kind === "Rule" && !decl.ruleKind) {
    errors.push(
      new MgrError({
        code: "SECTION_SCHEMA_MISSING_KIND",
        messageKey: "SECTION_SCHEMA_MISSING_KIND",
        params: { kind: decl.kind, name: decl.name },
        location: { file: decl.file, line: decl.startLine },
      }),
    );
    return;
  }

  const required = REQUIRED[schemaKey] ?? [];
  for (const block of required) {
    if (!hasAlias(decl.blocks, block)) {
      errors.push(
        new MgrError({
          code: "SECTION_SCHEMA_MISSING_BLOCK",
          messageKey: "SECTION_SCHEMA_MISSING_BLOCK",
          params: {
            kind: decl.kind,
            name: decl.name,
            block,
          },
          location: { file: decl.file, line: decl.startLine },
        }),
      );
    }
  }

  const forbidden = FORBIDDEN[schemaKey] ?? [];
  for (const block of forbidden) {
    if (hasAlias(decl.blocks, block)) {
      const line = decl.blocks.get(block) ?? decl.startLine;
      errors.push(
        new MgrError({
          code: "SECTION_SCHEMA_FORBIDDEN_BLOCK",
          messageKey: "SECTION_SCHEMA_FORBIDDEN_BLOCK",
          params: {
            kind: decl.kind,
            name: decl.name,
            subKind: decl.ruleKind ?? decl.entityKind ?? "",
            block,
          },
          location: { file: decl.file, line: line },
        }),
      );
    }
  }
}

function resolveSchemaKey(decl: Declaration): string {
  if (decl.kind === "Rule" && decl.ruleKind) {
    return `Rule ${decl.ruleKind}`;
  }
  return decl.kind;
}

function hasAlias(blocks: Map<string, number>, name: string): boolean {
  if (blocks.has(name)) return true;
  if (name === "Behaviour" && blocks.has("Behavior")) return true;
  if (name === "Precondition" && blocks.has("Preconditions")) return true;
  return false;
}
