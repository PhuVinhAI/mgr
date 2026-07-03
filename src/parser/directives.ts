/**
 * Directive Registry — per PRD-002 §14.
 *
 * The parser is directive-agnostic: it only recognises the `@name arg`
 * shape on a line and hands off to a handler looked up in the
 * registry. New directives can be added by registering a handler; no
 * parser code needs to change (PRD-002 §14 Extensibility).
 *
 * Foundation ships two leaf directives (`@import`, `@section`) and
 * eight block directives (`@variable`, `@entity`, `@formula`,
 * `@rule`, `@event`, `@action`, `@auto-action`, `@query`) per
 * PRD-008 §15a. Block directive handlers return a stub node with an
 * empty body; the parser collects the body lines itself.
 *
 * Every name listed in PRD-002 §11 (plus the names claimed by
 * PRD-005/006/008/009/010/011/012/013/014) is marked reserved: the
 * parser rejects it with a stable error rather than silently treating
 * it as unknown, so developer files never squat on a name a future
 * PRD may define.
 */
import { MgrError, type MgrErrorLocation } from "../errors/index.js";
import type {
  BlockDeclarationKind,
  BlockDeclarationNode,
  DirectiveNode,
  SectionNode,
  SourceLocation,
} from "./ast.js";

export type DirectiveCategory =
  | "project"
  | "metadata"
  | "structure"
  | "declaration"
  | "build";

export interface DirectiveContext {
  /** Absolute path of the source file. */
  file: string;
  /** POSIX relPath of the source file (relative to srcDir). */
  relPath: string;
  /** Raw argument string (trimmed). */
  arg: string;
  /** Location of the directive line inside the source file. */
  location: SourceLocation;
}

/**
 * A handler returns one of three node kinds:
 *
 * - DirectiveNode — a leaf line that the parser emits verbatim.
 *   `@import` is the canonical example.
 * - SectionNode — a container that opens a named section on the
 *   parser stack. `@section` is the canonical example.
 * - BlockDeclarationNode — a stub that the parser fills with body
 *   lines until a blank line, another directive, a heading, or
 *   end-of-section. The §15a declarations use this shape.
 *
 * Handlers must throw MgrError for any syntax problem so the parser
 * stays a pure dispatcher.
 */
export type DirectiveHandler = (
  ctx: DirectiveContext,
) => DirectiveNode | SectionNode | BlockDeclarationNode;

export interface DirectiveDefinition {
  /** Lowercased directive name (without the leading `@`). */
  name: string;
  category: DirectiveCategory;
  handler: DirectiveHandler;
}

/**
 * Names reserved by PRD-002 §11. These will be given semantics by
 * future PRDs; user code MUST NOT define them. The parser raises
 * DIRECTIVE_RESERVED when it encounters one that no Foundation
 * handler owns yet.
 *
 * The later blocks reserve names claimed by PRD-005 §7/§7a, PRD-006
 * §5a/§11a, PRD-008 §15a, PRD-009, PRD-010, PRD-011, PRD-012, and
 * PRD-013. Reserving them now keeps user files from squatting on
 * directives whose syntax lands in later Foundation releases.
 */
export const RESERVED_DIRECTIVES: ReadonlySet<string> = new Set([
  // PRD-002 §11 originals
  "include",
  "define",
  "const",
  "if",
  "elseif",
  "else",
  "endif",
  "warning",
  "deprecated",
  "plugin",
  "feature",
  "using",
  "override",
  "replace",
  "remove",
  "insert-before",
  "insert-after",
  "toc",
  "export",
  // PRD-006 §11a Visibility, §5a Transient Entity
  "visibility",
  "public",
  "private",
  "hidden",
  "transient",
  "entity",
  "variable",
  "collection",
  "property",
  // PRD-005 §7 / §7a Pre-Event / Post-Event
  "pre-event",
  "post-event",
  // PRD-009 Formula System
  "formula",
  // PRD-010 Rule Language
  "rule",
  "precondition",
  "effect",
  "trigger",
  "guard",
  "priority",
  // PRD-008 §15a Section Schema (shared block names)
  "kind",
  "attributes",
  "behaviour",
  "relationships",
  "phase",
  "lifetime",
  "type",
  "default",
  "domain",
  // PRD-012 Action Resolution
  "action",
  "intent",
  "parameters",
  "auto-action",
  "reserved-intent",
  "passthrough",
  // PRD-013 Query & Selector
  "query",
  "where",
  "select",
  "order-by",
  "limit",
  "first",
  "last",
  "any",
  "all",
  "none",
  // PRD-011 Rule Execution Model
  "atomic",
  "rollback",
  "conflict-policy",
  "snapshot",
  // PRD-014 Documentation Schema
  "purpose",
  "failure",
  "notes",
  "examples",
]);

export class DirectiveRegistry {
  private readonly definitions = new Map<string, DirectiveDefinition>();

  register(def: DirectiveDefinition): void {
    const name = def.name.toLowerCase();
    if (RESERVED_DIRECTIVES.has(name) && !FOUNDATION_NAMES.has(name)) {
      // Guard: only Foundation-owned or future-PRD registrations may
      // claim reserved names. Rejecting here means user extensions
      // cannot squat on names PRD-002 §11 marks as reserved.
      throw new MgrError({
        code: "DIRECTIVE_RESERVED",
        messageKey: "DIRECTIVE_RESERVED",
        params: { name },
        directive: `@${name}`,
      });
    }
    this.definitions.set(name, { ...def, name });
  }

  get(name: string): DirectiveDefinition | undefined {
    return this.definitions.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.definitions.has(name.toLowerCase());
  }

  isReserved(name: string): boolean {
    return RESERVED_DIRECTIVES.has(name.toLowerCase());
  }

  /** All registered directive names, lowercased. */
  names(): string[] {
    return [...this.definitions.keys()];
  }

  /** Levenshtein-lite suggestion among registered directive names. */
  suggest(name: string): string | undefined {
    const target = name.toLowerCase();
    let best: string | undefined;
    let bestDist = Infinity;
    for (const candidate of this.definitions.keys()) {
      const d = editDistance(target, candidate);
      if (d < bestDist) {
        bestDist = d;
        best = candidate;
      }
    }
    return bestDist <= 2 ? best : undefined;
  }
}

// -----------------------------------------------------------------
// Foundation handlers (PRD-002 §5, PRD-008 §15a).
// -----------------------------------------------------------------

const FOUNDATION_NAMES: ReadonlySet<string> = new Set([
  "import",
  "section",
  "variable",
  "entity",
  "formula",
  "rule",
  "event",
  "action",
  "auto-action",
  "query",
]);

const importHandler: DirectiveHandler = (ctx) => {
  const target = ctx.arg.trim();
  if (target.length === 0) {
    throw new MgrError({
      code: "DIRECTIVE_SYNTAX",
      messageKey: "DIRECTIVE_SYNTAX_IMPORT_MISSING_PATH",
      location: locFor(ctx.file, ctx.location.line),
      directive: "@import",
    });
  }
  const node: DirectiveNode = {
    type: "directive",
    name: "import",
    arg: target,
    location: ctx.location,
  };
  return node;
};

const sectionHandler: DirectiveHandler = (ctx) => {
  const id = ctx.arg.trim();
  if (id.length === 0) {
    throw new MgrError({
      code: "DIRECTIVE_SYNTAX",
      messageKey: "DIRECTIVE_SYNTAX_SECTION_MISSING_ID",
      location: locFor(ctx.file, ctx.location.line),
      directive: "@section",
    });
  }
  if (!isValidSectionId(id)) {
    throw new MgrError({
      code: "DIRECTIVE_SYNTAX",
      messageKey: "DIRECTIVE_SYNTAX_SECTION_INVALID_ID",
      params: { id },
      location: locFor(ctx.file, ctx.location.line),
      directive: "@section",
    });
  }
  const section: SectionNode = {
    type: "section",
    id,
    location: ctx.location,
    body: [],
  };
  return section;
};

/**
 * Build a stub BlockDeclarationNode for a §15a block directive.
 * Centralises the validation rules shared by all eight block
 * handlers: a non-empty name composed of valid identifier characters.
 */
function buildDeclarationStub(
  kind: BlockDeclarationKind,
  ctx: DirectiveContext,
): BlockDeclarationNode {
  const name = ctx.arg.trim();
  if (name.length === 0) {
    throw new MgrError({
      code: "DIRECTIVE_SYNTAX",
      messageKey: "DIRECTIVE_SYNTAX_DECLARATION_MISSING_NAME",
      params: { kind },
      location: locFor(ctx.file, ctx.location.line),
      directive: `@${kind}`,
    });
  }
  if (!isValidDeclarationName(name)) {
    throw new MgrError({
      code: "DIRECTIVE_SYNTAX",
      messageKey: "DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME",
      params: { kind, name },
      location: locFor(ctx.file, ctx.location.line),
      directive: `@${kind}`,
    });
  }
  return {
    type: "declaration",
    kind,
    name,
    body: "",
    bodyLines: [],
    location: ctx.location,
  };
}

function makeBlockHandler(
  kind: BlockDeclarationKind,
): DirectiveHandler {
  return (ctx) => buildDeclarationStub(kind, ctx);
}

/**
 * Build the registry Foundation ships with. Callers may register more
 * directives (or replace these) before parsing.
 */
export function createFoundationRegistry(): DirectiveRegistry {
  const r = new DirectiveRegistry();
  r.register({
    name: "import",
    category: "project",
    handler: importHandler,
  });
  r.register({
    name: "section",
    category: "structure",
    handler: sectionHandler,
  });
  // PRD-008 §15a block declarations.
  r.register({
    name: "variable",
    category: "declaration",
    handler: makeBlockHandler("variable"),
  });
  r.register({
    name: "entity",
    category: "declaration",
    handler: makeBlockHandler("entity"),
  });
  r.register({
    name: "formula",
    category: "declaration",
    handler: makeBlockHandler("formula"),
  });
  r.register({
    name: "rule",
    category: "declaration",
    handler: makeBlockHandler("rule"),
  });
  r.register({
    name: "event",
    category: "declaration",
    handler: makeBlockHandler("event"),
  });
  r.register({
    name: "action",
    category: "declaration",
    handler: makeBlockHandler("action"),
  });
  r.register({
    name: "auto-action",
    category: "declaration",
    handler: makeBlockHandler("auto-action"),
  });
  r.register({
    name: "query",
    category: "declaration",
    handler: makeBlockHandler("query"),
  });
  return r;
}

function locFor(file: string, line: number): MgrErrorLocation {
  return { file, line };
}

function isValidSectionId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id);
}

/**
 * Declaration names permit Title-Case identifiers and the space-
 * separated form used by §15a (`Auto Action End Day`). Each word
 * must start with an upper-case letter and contain only letters,
 * digits, and underscores. This deliberately excludes sentence-like
 * text so an `Action` block whose `Intent:` value happens to start
 * with a lowercase word cannot be misparsed as a declaration.
 */
function isValidDeclarationName(name: string): boolean {
  const words = name.split(/\s+/);
  return words.every(
    (w) => w.length > 0 && /^[A-Z][A-Za-z0-9_]*$/.test(w),
  );
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
        (dp[j] ?? 0) + 1,
        (dp[j - 1] ?? 0) + 1,
        prev + cost,
      );
      prev = tmp;
    }
  }
  return dp[n] ?? 0;
}
