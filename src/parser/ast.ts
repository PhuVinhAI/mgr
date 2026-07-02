/**
 * MGR AST types.
 * A MgrDocument is one source file expressed as a sequence of blocks.
 * Blocks are either Markdown content (kept as raw text, verbatim from source)
 * or MGR directives (@import, @section, ...).
 */

/**
 * Directive names are strings so the registry (PRD-002 §14) can add
 * new directives without touching the AST. Foundation ships `import`
 * and `section`; future PRDs may register more.
 */
export type DirectiveName = string;

export interface SourceLocation {
  /** 1-based line number. */
  line: number;
  /** 1-based column. */
  column: number;
}

export interface DirectiveNode {
  type: "directive";
  name: DirectiveName;
  /** Raw argument string (whatever came after the directive name). */
  arg: string;
  /** Location of the directive line inside the source file. */
  location: SourceLocation;
}

export interface MarkdownBlockNode {
  type: "markdown";
  /** Raw markdown text, verbatim. */
  value: string;
  location: SourceLocation;
}

export interface SectionNode {
  type: "section";
  /** Section id declared by `@section <id>`. */
  id: string;
  /** Location of the `@section` directive. */
  location: SourceLocation;
  /** Body blocks belonging to this section. */
  body: BlockNode[];
}

export type BlockNode = DirectiveNode | MarkdownBlockNode | SectionNode;

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
}
