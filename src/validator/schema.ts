/**
 * Section + Documentation Schema Validator.
 *
 * Combines PRD-008 §15a (Section Schema — required and forbidden
 * execution blocks per Kind) with PRD-014 (Documentation Schema —
 * required Purpose block on Rule/Action/Event and recommended
 * Failure block on Rule Transformation/Guard and Action) plus
 * PRD-009 §18a (Formula body must be an expression, not prose).
 *
 * Emission:
 *   - errors    → build fails. Missing execution block, forbidden
 *                 block, duplicate block, missing Kind, missing
 *                 required Purpose.
 *   - warnings  → build passes; CLI lists them. Recommended blocks
 *                 (Purpose on non-Rule kinds, Failure on Rule
 *                 Transformation/Guard/Action), invalid Formula body.
 *
 * The scanner is line-based and forgiving of surrounding prose so
 * authors can annotate around declarations with Markdown headings and
 * HTML comments without breaking validation.
 */
import * as path from "node:path";
import { MgrError } from "../errors/index.js";
import type { ProjectGraph } from "../graph/index.js";
import type { BlockNode, MarkdownBlockNode } from "../parser/ast.js";

/** The declaration kinds §15a enumerates. */
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
  /**
   * Lines collected between the declaration header and the first
   * recognized block heading. Used to validate Formula body per
   * PRD-009 §18a.
   */
  bodyLines: string[];
  /** Absolute line of the declaration header. */
  startLine: number;
  file: string;
}

/**
 * A declaration header is `<Kind> <Name>` on its own line, where the
 * Name is one or more Title-Case identifiers separated by single
 * spaces. This deliberately excludes sentence-like text so a paragraph
 * that happens to begin with "Rule" or "Action" inside a Purpose /
 * Notes block does not get misparsed as a declaration.
 */
const DECL_RE = /^(Variable|Entity|Formula|Rule|Event|Query|Auto Action|Action)\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\s*$/;
const BLOCK_RE = /^([A-Z][A-Za-z ]*[A-Za-z]):\s*(.*)$/;

/**
 * The block-name catalog. Execution blocks come from §15a.1-.7.
 * Documentation blocks come from PRD-014 §3.
 * Anything outside this set is treated as content (Parameter/value
 * inside a block, etc.) — see §15a.10.
 */
const KNOWN_BLOCKS: ReadonlySet<string> = new Set([
  // Execution blocks
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
  // Documentation blocks (PRD-014 §3)
  "Purpose",
  "Failure",
  "Notes",
  "Examples",
]);

/** Per-kind required execution blocks. §15a. */
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

/** Per-kind forbidden blocks. §15a. */
const FORBIDDEN: Record<string, ReadonlyArray<string>> = {
  "Rule Guard": ["Effect"],
};

/**
 * PRD-014 §4 — Purpose required at ERROR level for these kinds.
 * Any decl whose schema-key hits this set must declare a Purpose
 * block; missing → hard error.
 */
const PURPOSE_ERROR_KINDS: ReadonlySet<string> = new Set([
  "Rule Guard",
  "Rule Transformation",
  "Rule Trigger",
  "Event",
  "Action",
  "Auto Action",
]);

/**
 * PRD-014 §4 — Purpose required at WARNING level for these kinds.
 * Missing → advisory; build still passes.
 */
const PURPOSE_WARNING_KINDS: ReadonlySet<string> = new Set([
  "Entity",
  "Variable",
  "Formula",
  "Query",
]);

/**
 * PRD-014 §4 — Failure required at WARNING level for these kinds.
 * These are declarations that can meaningfully reject player input.
 */
const FAILURE_WARNING_KINDS: ReadonlySet<string> = new Set([
  "Rule Transformation",
  "Rule Guard",
  "Action",
]);

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
      collectDeclarations(block, absFile, errors, warnings);
    }
  }

  return { errors, warnings };
}

function collectDeclarations(
  block: BlockNode,
  file: string,
  errors: MgrError[],
  warnings: MgrError[],
): void {
  if (block.type === "section") {
    for (const child of block.body) {
      collectDeclarations(child, file, errors, warnings);
    }
    return;
  }
  if (block.type !== "markdown") return;
  scanMarkdown(block, file, errors, warnings);
}

function scanMarkdown(
  block: MarkdownBlockNode,
  file: string,
  errors: MgrError[],
  warnings: MgrError[],
): void {
  const lines = block.value.split(/\r\n|\r|\n/);
  const baseLine = block.location.line;

  let current: Declaration | null = null;
  let inHtmlComment = false;

  const finish = (): void => {
    if (current) {
      emitForDeclaration(current, errors, warnings);
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
        bodyLines: [],
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
        const inline = (blockMatch[2] ?? "").trim();
        const value = inline.length > 0 ? inline : nextValue(lines, i);
        if (current.kind === "Rule") {
          if (
            value === "Guard" ||
            value === "Transformation" ||
            value === "Trigger"
          ) {
            current.ruleKind = value;
          }
        } else if (current.kind === "Entity") {
          current.entityKind = value;
        }
      }

      if (!KNOWN_BLOCKS.has(blockName)) {
        // Not a top-level block heading — treat as content. Typo
        // detection is downstream via SECTION_SCHEMA_MISSING_BLOCK.
        //
        // If this decl still hasn't recorded a block, the line is
        // part of the body (relevant for Formula body validation).
        if (current.kind === "Formula" && current.blocks.size === 0) {
          current.bodyLines.push(line);
        }
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

    // Non-block, non-heading, non-decl content line.
    if (current.kind === "Formula" && current.blocks.size === 0) {
      current.bodyLines.push(line);
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

function emitForDeclaration(
  decl: Declaration,
  errors: MgrError[],
  warnings: MgrError[],
): void {
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

  // PRD-014 §4 — Documentation Schema.
  const hasPurpose = decl.blocks.has("Purpose");
  if (!hasPurpose) {
    if (PURPOSE_ERROR_KINDS.has(schemaKey)) {
      errors.push(
        new MgrError({
          code: "DOCUMENTATION_PURPOSE_MISSING",
          messageKey: "DOCUMENTATION_PURPOSE_MISSING",
          params: { kind: decl.kind, name: decl.name },
          location: { file: decl.file, line: decl.startLine },
        }),
      );
    } else if (PURPOSE_WARNING_KINDS.has(schemaKey)) {
      warnings.push(
        new MgrError({
          code: "DOCUMENTATION_PURPOSE_MISSING",
          messageKey: "DOCUMENTATION_PURPOSE_MISSING",
          params: { kind: decl.kind, name: decl.name },
          location: { file: decl.file, line: decl.startLine },
        }),
      );
    }
  }

  const hasFailure = decl.blocks.has("Failure");
  if (!hasFailure && FAILURE_WARNING_KINDS.has(schemaKey)) {
    warnings.push(
      new MgrError({
        code: "DOCUMENTATION_FAILURE_MISSING",
        messageKey: "DOCUMENTATION_FAILURE_MISSING",
        params: { kind: decl.kind, name: decl.name },
        location: { file: decl.file, line: decl.startLine },
      }),
    );
  }

  // PRD-009 §18a — Formula body must look like an expression.
  if (decl.kind === "Formula" && !isFormulaBodyValid(decl.bodyLines)) {
    warnings.push(
      new MgrError({
        code: "FORMULA_BODY_INVALID",
        messageKey: "FORMULA_BODY_INVALID",
        params: { name: decl.name },
        location: { file: decl.file, line: decl.startLine },
      }),
    );
  }
}

/**
 * Heuristic check for PRD-009 §18a Formula body validity.
 *
 * Positive matches:
 *   - Contains an arithmetic/comparison/boolean operator.
 *   - Piecewise ("When ... Then ..." or "Otherwise ... Then ...").
 *   - Bounded / aggregation / random head (Round, Clamp, Sum, Uniform, …).
 *   - Single Named Formula reference on one line.
 *
 * Otherwise the body reads as prose and gets FORMULA_BODY_INVALID.
 */
function isFormulaBodyValid(bodyLines: string[]): boolean {
  const nonEmpty = bodyLines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return true; // handled by §15a schema
  const body = nonEmpty.join("\n");

  if (/\bWhen\b/.test(body) && /\bThen\b/.test(body)) return true;
  if (/\bOtherwise\b/.test(body)) return true;

  if (
    /\b(Round|Floor|Ceil|Clamp|Min|Max|Sum|Count|Average|First|Last|Uniform|Weighted|Any|All|None|Monotonic)\s*\(/
      .test(body)
  ) {
    return true;
  }

  if (/[+\-×÷*/=<>≤≥≠]/.test(body)) return true;
  if (/\b(mod|AND|OR|NOT)\b/.test(body)) return true;

  // Single-line Named Formula reference.
  if (nonEmpty.length === 1 && /^[A-Z][A-Za-z0-9]*$/.test(body.trim())) {
    return true;
  }

  return false;
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
