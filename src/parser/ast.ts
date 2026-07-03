/**
 * MGR AST types.
 * A MgrDocument is one source file expressed as a sequence of blocks.
 * Blocks are either Markdown content (kept as raw text, verbatim from source),
 * MGR directives (@import, @section, ...), or MGR block declarations
 * (@variable, @entity, @formula, @rule, @event, @action, @auto-action,
 * @query) which carry a multi-line body of field-style content.
 */

/**
 * Directive names are strings so the registry (PRD-002 §14) can add
 * new directives without touching the AST. Foundation ships `import`
 * and `section`; the §15a block declarations (`variable`, `entity`,
 * `formula`, `rule`, `event`, `action`, `auto-action`, `query`) are
 * first-class directives that consume multi-line bodies.
 */
export type DirectiveName = string;

export interface SourceLocation {
  /** 1-based line number. */
  line: number;
  /** 1-based column. */
  column: number;
}

/**
 * The set of declaration kinds that have a first-class directive.
 * Section Schema (PRD-008 §15a) treats these as the canonical kinds.
 */
export type BlockDeclarationKind =
  | "variable"
  | "entity"
  | "formula"
  | "rule"
  | "event"
  | "action"
  | "auto-action"
  | "query";

/**
 * A leaf directive on its own line. `@import` is the canonical
 * example: the parser stores it verbatim and the graph builder
 * resolves the path. Other single-line directives may be added by
 * registering handlers in the DirectiveRegistry (PRD-002 §14).
 */
export interface DirectiveNode {
  type: "directive";
  name: DirectiveName;
  /** Raw argument string (whatever came after the directive name). */
  arg: string;
  /** Location of the directive line inside the source file. */
  location: SourceLocation;
}

/**
 * Raw markdown text, verbatim. The Bundler emits this without
 * transformation; the Section Schema validator scans it for
 * `<Kind> <Name>` declaration headers (kept for backward
 * compatibility with prose-style sources).
 */
export interface MarkdownBlockNode {
  type: "markdown";
  /** Raw markdown text, verbatim. */
  value: string;
  location: SourceLocation;
}

/**
 * A first-class declaration directive (`@variable`, `@entity`, ...).
 *
 * The directive header is the line `@<kind> <name>` and the body is
 * the contiguous run of subsequent lines that does not start with
 * `@`, `#`, or a blank line. The body is stored verbatim and emitted
 * verbatim by the Bundler; the Section Schema validator parses it
 * for `Block:` field headings the same way it parses Markdown content.
 *
 * Body lines are tracked with their absolute file location so
 * validator error messages can point at the exact source line, not
 * the directive header.
 */
export interface BlockDeclarationNode {
  type: "declaration";
  kind: BlockDeclarationKind;
  /** Name declared after the directive (e.g. `Money` for `@variable Money`). */
  name: string;
  /**
   * Raw body text, one field per line, no surrounding blank lines.
   * Empty string when the directive is followed immediately by a
   * blank line (an empty declaration).
   */
  body: string;
  /**
   * Per-line location info for the body, parallel to the lines of
   * `body` split on `\n`. Empty array when body is empty.
   */
  bodyLines: SourceLocation[];
  /** Location of the directive header line inside the source file. */
  location: SourceLocation;
}

/**
 * A named section opened by `@section <id>`. Foundation sections do
 * not nest: a new `@section` closes the previous one and reopens at
 * root. Reserved section ids map to PSF canonical sections (PRD-003
 * §11) and are emitted in a fixed order by the Bundler.
 */
export interface SectionNode {
  type: "section";
  /** Section id declared by `@section <id>`. */
  id: string;
  /** Location of the `@section` directive. */
  location: SourceLocation;
  /** Body blocks belonging to this section. */
  body: BlockNode[];
}

export type BlockNode =
  | DirectiveNode
  | MarkdownBlockNode
  | BlockDeclarationNode
  | SectionNode;

export interface MgrDocument {
  /** Absolute path of the source file. */
  file: string;
  /** Path relative to project srcDir (POSIX-normalized). */
  relPath: string;
  /** Top-level blocks (may include SectionNodes or free markdown). */
  blocks: BlockNode[];
  /** All @import directives (flat, for graph building). */
  imports: DirectiveNode[];
  /** All sections declared in this document (flat). */
  sections: SectionNode[];
  /** All block declarations across this document (flat). */
  declarations: BlockDeclarationNode[];
}
