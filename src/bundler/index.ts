/**
 * Bundler.
 *
 * Emits a single Prompt Specification by concatenating documents in
 * the graph's topological order. Each document contributes its blocks
 * in source order; @section directives become H2 headings; @import
 * directives are dropped (their targets have already been emitted).
 *
 * Determinism: order = graph.order (deterministic DFS post-order).
 *              content = raw source text, unchanged.
 */
import type { ProjectGraph } from "../graph/index.js";
import type {
  BlockNode,
  MgrDocument,
  SectionNode,
} from "../parser/ast.js";

export interface BundleResult {
  /** The single bundled Markdown string. */
  content: string;
  /** Files (relPath) that contributed to the bundle, in emission order. */
  order: string[];
}

export function bundle(graph: ProjectGraph): BundleResult {
  const parts: string[] = [];
  const emitted: string[] = [];

  for (const rel of graph.order) {
    const doc = graph.documents.get(rel);
    if (!doc) continue;
    const chunk = renderDocument(doc);
    if (chunk.length === 0) continue;
    parts.push(`<!-- file: ${doc.relPath} -->`);
    parts.push(chunk);
    emitted.push(rel);
  }

  return {
    content: parts.join("\n\n"),
    order: emitted,
  };
}

function renderDocument(doc: MgrDocument): string {
  const out: string[] = [];
  for (const block of doc.blocks) {
    const rendered = renderBlock(block);
    if (rendered.length === 0) continue;
    out.push(rendered);
  }
  return out.join("\n\n").trim();
}

function renderBlock(block: BlockNode): string {
  switch (block.type) {
    case "markdown":
      return block.value.trim();
    case "directive":
      // @import is a build-time dependency edge only.
      return "";
    case "section":
      return renderSection(block);
  }
}

function renderSection(section: SectionNode): string {
  const body = section.body
    .map(renderBlock)
    .filter((s) => s.length > 0)
    .join("\n\n")
    .trim();
  const header = `## ${section.id}`;
  return body.length === 0 ? header : `${header}\n\n${body}`;
}
