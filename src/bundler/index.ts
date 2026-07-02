/**
 * Bundler — emits a Prompt Specification (PRD-003).
 *
 * The Bundler produces a single Markdown document with a fixed
 * envelope:
 *
 *   1. Project title  (`# <name>`)
 *   2. Metadata       (§14: Project, Version, Build Date, Compiler
 *                       Version, Specification Version)
 *   3. Table of Contents (§13)
 *   4. Preamble       — any free markdown that lived outside a
 *                       `@section` in the source files, if any
 *   5. Canonical sections in §11 order
 *   6. Custom sections in first-seen order
 *
 * Each Section is separated by an explicit boundary (`---`) followed
 * by a level-1 heading (§15). Directives never appear in the output
 * (§16); their effect was consumed by the Graph and Parser layers.
 *
 * Determinism (§17): identical inputs produce byte-identical outputs.
 * The only externally-supplied value is `buildDate`; the caller is
 * expected to pin it in tests that assert stability.
 */
import type { ProjectGraph } from "../graph/index.js";
import type {
  BlockNode,
  MgrDocument,
  SectionNode,
} from "../parser/ast.js";
import {
  PSF_SPEC_VERSION,
  psfSectionRank,
  psfSectionTitle,
  canonicalizeSectionId,
} from "../psf/index.js";
import {
  RUNTIME_SECTIONS,
  RUNTIME_SPEC_VERSION,
} from "../runtime/index.js";

export interface BundleMetadata {
  /** Project name (from mgr.config.json). */
  project: string;
  /** Project version (from mgr.config.json). */
  version: string;
  /** Build timestamp, ISO-8601. Pin in tests for determinism. */
  buildDate: string;
  /** Compiler version (mgr package version). */
  compilerVersion: string;
  /** Optional author (PRD-008 §4). */
  author?: string;
  /** Optional package description (PRD-008 §4). */
  description?: string;
  /** Optional declared target Runtime version (PRD-008 §16). */
  runtimeTarget?: string;
}

export interface BundleInput {
  graph: ProjectGraph;
  metadata: BundleMetadata;
}

export interface BundleResult {
  /** The single bundled Markdown string (a Prompt Specification). */
  content: string;
  /** Files (relPath) that contributed to the bundle, in emission order. */
  order: string[];
  /** Section ids that appear in the output, in emission order. */
  sectionOrder: string[];
}

const BOUNDARY = "---";

export function bundle(input: BundleInput): BundleResult {
  const { graph, metadata } = input;

  // 1. Walk documents in topological order and collect (a) top-level
  //    preamble markdown and (b) each @section together with its
  //    rendered body. Preserving graph order keeps §17 (stability).
  const preamble: string[] = [];
  const sectionOrderRaw: SectionNode[] = [];
  const emittedFiles: string[] = [];

  for (const rel of graph.order) {
    const doc = graph.documents.get(rel);
    if (!doc) continue;
    let contributed = false;
    for (const block of doc.blocks) {
      if (block.type === "markdown") {
        const trimmed = block.value.trim();
        if (trimmed.length === 0) continue;
        preamble.push(trimmed);
        contributed = true;
      } else if (block.type === "section") {
        sectionOrderRaw.push(block);
        contributed = true;
      }
      // Directive nodes are intentionally dropped: §16 Prompt Purity.
    }
    if (contributed) emittedFiles.push(rel);
  }

  // 2. Split canonical from custom sections and sort by §11 rank.
  //    Custom sections keep their appearance order for determinism.
  const canonical: SectionNode[] = [];
  const custom: SectionNode[] = [];
  for (const s of sectionOrderRaw) {
    if (psfSectionRank(s.id) >= 0) canonical.push(s);
    else custom.push(s);
  }
  canonical.sort((a, b) => psfSectionRank(a.id) - psfSectionRank(b.id));

  // 2b. Inject Runtime Layer defaults (PRD-004). MGR ships canonical
  //     bodies for `runtime`, `turn-loop`, `state-machine`,
  //     `memory-model`, `validation`, and `output-contract` so every
  //     game shares the same base behavior. Author-provided sections
  //     with the same id win — the user's `@section runtime` overrides
  //     the default and no synthesized copy is added.
  const authored = new Set(
    canonical.map((s) => canonicalizeSectionId(s.id)),
  );
  for (const rt of RUNTIME_SECTIONS) {
    if (authored.has(rt.id)) continue;
    canonical.push(synthesizeSection(rt.id, rt.body));
  }
  canonical.sort((a, b) => psfSectionRank(a.id) - psfSectionRank(b.id));

  const orderedSections: SectionNode[] = [...canonical, ...custom];

  // 3. Compose the envelope.
  const parts: string[] = [];
  const sectionIds: string[] = [];

  parts.push(`# ${metadata.project}`);
  parts.push(renderMetadata(metadata));
  parts.push(renderToc(orderedSections, preamble.length > 0));

  if (preamble.length > 0) {
    parts.push(BOUNDARY);
    parts.push(`# PREAMBLE`);
    parts.push(preamble.join("\n\n"));
    sectionIds.push("preamble");
  }

  for (const section of orderedSections) {
    parts.push(BOUNDARY);
    parts.push(`# ${psfSectionTitle(section.id)}`);
    const body = renderSectionBody(section);
    if (body.length > 0) parts.push(body);
    sectionIds.push(canonicalizeSectionId(section.id));
  }

  return {
    content: parts.join("\n\n"),
    order: emittedFiles,
    sectionOrder: sectionIds,
  };
}

// -----------------------------------------------------------------
// Rendering helpers
// -----------------------------------------------------------------

function renderMetadata(m: BundleMetadata): string {
  const lines: string[] = [];
  lines.push(`## Metadata`);
  lines.push("");
  lines.push(`- Project: ${m.project}`);
  lines.push(`- Version: ${m.version}`);
  if (m.author) lines.push(`- Author: ${m.author}`);
  if (m.description) lines.push(`- Description: ${m.description}`);
  if (m.runtimeTarget) lines.push(`- Target Runtime: ${m.runtimeTarget}`);
  lines.push(`- Build Date: ${m.buildDate}`);
  lines.push(`- Compiler Version: ${m.compilerVersion}`);
  lines.push(`- Specification Version: ${PSF_SPEC_VERSION}`);
  lines.push(`- Runtime Spec Version: ${RUNTIME_SPEC_VERSION}`);
  return lines.join("\n");
}

function renderToc(
  sections: readonly SectionNode[],
  hasPreamble: boolean,
): string {
  const lines: string[] = [];
  lines.push(`## Table of Contents`);
  lines.push("");
  let idx = 1;
  if (hasPreamble) {
    lines.push(`${idx}. PREAMBLE`);
    idx++;
  }
  for (const s of sections) {
    lines.push(`${idx}. ${psfSectionTitle(s.id)}`);
    idx++;
  }
  return lines.join("\n");
}

function renderSectionBody(section: SectionNode): string {
  const out: string[] = [];
  for (const block of section.body) {
    const rendered = renderInlineBlock(block);
    if (rendered.length === 0) continue;
    out.push(rendered);
  }
  return out.join("\n\n").trim();
}

function renderInlineBlock(block: BlockNode): string {
  switch (block.type) {
    case "markdown":
      return block.value.trim();
    case "directive":
      // §16: directives are build-time only and never appear in output.
      return "";
    case "section":
      // Sections do not nest in Foundation; if a parser bug produced
      // a nested SectionNode, flatten it defensively so we still emit
      // a well-formed document.
      return renderSectionBody(block);
  }
}

// Re-exported for callers who want to inspect the individual documents.
export function documentSectionIds(doc: MgrDocument): string[] {
  return doc.sections.map((s) => canonicalizeSectionId(s.id));
}

/**
 * Build a SectionNode from a canonical body string. Used to inject the
 * Runtime Layer defaults (PRD-004) when the author did not provide an
 * `@section` for one of the reserved runtime ids.
 */
function synthesizeSection(id: string, body: string): SectionNode {
  const loc = { line: 0, column: 0 };
  return {
    type: "section",
    id,
    location: loc,
    body: [
      {
        type: "markdown",
        value: body,
        location: loc,
      },
    ],
  };
}
