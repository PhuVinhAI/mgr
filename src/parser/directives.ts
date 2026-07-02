/**
 * Directive Registry — per PRD-002 §14.
 *
 * The parser is directive-agnostic: it only recognizes the `@name arg`
 * shape on a line and hands off to a handler looked up in the registry.
 * New directives can be added by registering a handler; no parser code
 * needs to change (PRD-002 §14 Extensibility).
 *
 * Two directives ship with Foundation: `@import` and `@section`
 * (PRD-002 §5). Every name listed in PRD-002 §11 is marked reserved:
 * the parser rejects it with a stable error rather than silently
 * treating it as unknown, so developer files never squat on a name a
 * future PRD may define.
 */
import { MgrError, type MgrErrorLocation } from "../errors/index.js";
import type {
  DirectiveNode,
  SectionNode,
  SourceLocation,
} from "./ast.js";

export type DirectiveCategory =
  | "project"
  | "metadata"
  | "structure"
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
 * A handler returns either a DirectiveNode (a leaf) or a SectionNode
 * (a container that becomes the current section on the parser stack).
 * Handlers must throw MgrError for any syntax problem so the parser
 * stays a pure dispatcher.
 */
export type DirectiveHandler = (
  ctx: DirectiveContext,
) => DirectiveNode | SectionNode;

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
 * The second block reserves names claimed by PRD-005 §7/§7a, PRD-006
 * §5a/§11a, PRD-009, and PRD-010. Reserving them now keeps user files
 * from squatting on directives whose syntax lands in later Foundation
 * releases.
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
// Foundation handlers (PRD-002 §5): @import and @section.
// -----------------------------------------------------------------

const FOUNDATION_NAMES: ReadonlySet<string> = new Set(["import", "section"]);

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
  return r;
}

function locFor(file: string, line: number): MgrErrorLocation {
  return { file, line };
}

function isValidSectionId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id);
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
