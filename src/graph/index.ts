/**
 * Project Graph.
 *
 * Loads the entry file, follows every @import edge, and yields a directed
 * graph of MgrDocuments. Detects cycles deterministically. Emits errors
 * with file+line pointing at the exact @import that could not resolve.
 */
import { stat } from "node:fs/promises";
import * as path from "node:path";
import { MgrError } from "../errors/index.js";
import { parseFile } from "../parser/index.js";
import type { DirectiveRegistry } from "../parser/directives.js";
import type { MgrDocument, DirectiveNode } from "../parser/ast.js";

export interface ProjectGraph {
  /** Absolute path of srcDir. */
  srcDir: string;
  /** POSIX relPath of the entry document. */
  entry: string;
  /** All documents, keyed by POSIX relPath. */
  documents: Map<string, MgrDocument>;
  /** Edges from importer relPath → imported relPath. */
  edges: Map<string, string[]>;
  /**
   * Deterministic topological order of documents (importers after
   * their imports). Used by the Bundler.
   */
  order: string[];
}

export interface BuildGraphInput {
  /** Absolute srcDir path. */
  srcDir: string;
  /** Entry file, relative to srcDir. */
  entry: string;
  /** Optional directive registry (PRD-002 §14). */
  registry?: DirectiveRegistry;
}

export async function buildGraph(
  input: BuildGraphInput,
): Promise<ProjectGraph> {
  const srcDir = path.resolve(input.srcDir);
  const entryRel = toPosix(input.entry);
  const entryAbs = path.join(srcDir, entryRel);

  await ensureFileExists(entryAbs, "entry file", undefined);

  const documents = new Map<string, MgrDocument>();
  const edges = new Map<string, string[]>();

  // BFS load + parse.
  const queue: Array<{ abs: string; rel: string }> = [
    { abs: entryAbs, rel: entryRel },
  ];

  while (queue.length > 0) {
    const { abs, rel } = queue.shift()!;
    if (documents.has(rel)) continue;

    const doc = await parseFile(abs, rel, input.registry);
    documents.set(rel, doc);

    const importRels: string[] = [];
    // PRD-002 §8: a file that imports the same target twice is
    // silently deduplicated. Cycles are still surfaced downstream by
    // topologicalOrder().
    const seen = new Set<string>();
    for (const imp of doc.imports) {
      const targetRel = await resolveImport(srcDir, rel, imp);
      if (seen.has(targetRel)) continue;
      seen.add(targetRel);
      importRels.push(targetRel);
      const targetAbs = path.join(srcDir, targetRel);
      if (!documents.has(targetRel)) {
        queue.push({ abs: targetAbs, rel: targetRel });
      }
    }
    edges.set(rel, importRels);
  }

  const order = topologicalOrder(entryRel, edges);

  return {
    srcDir,
    entry: entryRel,
    documents,
    edges,
    order,
  };
}

async function ensureFileExists(
  abs: string,
  label: string,
  directive: DirectiveNode | undefined,
): Promise<void> {
  try {
    const st = await stat(abs);
    if (!st.isFile()) {
      throw new MgrError({
        code: "FILE_NOT_FOUND",
        messageKey: "FILE_NOT_FOUND",
        params: { label, path: abs },
        location: directiveLoc(abs, directive),
        ...(directive ? { directive: `@${directive.name}` } : {}),
      });
    }
  } catch (cause) {
    if (cause instanceof MgrError) throw cause;
    throw new MgrError({
      code: directive ? "IMPORT_NOT_FOUND" : "FILE_NOT_FOUND",
      messageKey: directive ? "IMPORT_NOT_FOUND" : "FILE_NOT_FOUND",
      params: directive
        ? { path: abs }
        : { label, path: abs },
      location: directiveLoc(abs, directive),
      ...(directive ? { directive: `@${directive.name}` } : {}),
      cause,
    });
  }
}

function directiveLoc(fallbackFile: string, d: DirectiveNode | undefined) {
  if (!d) return { file: fallbackFile };
  return { file: fallbackFile, line: d.location.line };
}

async function resolveImport(
  srcDir: string,
  fromRel: string,
  imp: DirectiveNode,
): Promise<string> {
  const raw = imp.arg.trim();
  const withExt = raw.endsWith(".md") ? raw : `${raw}.md`;

  const isRootRelative = withExt.startsWith("/");
  const fromDir = path.posix.dirname(toPosix(fromRel));
  const targetPosix = isRootRelative
    ? withExt.replace(/^\/+/, "")
    : path.posix.normalize(path.posix.join(fromDir, withExt));

  if (targetPosix.startsWith("..") || targetPosix.startsWith("/")) {
    throw new MgrError({
      code: "IMPORT_OUTSIDE_SRC",
      messageKey: "IMPORT_OUTSIDE_SRC",
      params: { path: raw },
      location: { file: path.join(srcDir, fromRel), line: imp.location.line },
      directive: "@import",
    });
  }

  const abs = path.join(srcDir, targetPosix);
  const importerAbs = path.join(srcDir, fromRel);
  await ensureFileExistsAt(abs, importerAbs, imp);
  return targetPosix;
}

async function ensureFileExistsAt(
  targetAbs: string,
  importerAbs: string,
  d: DirectiveNode,
): Promise<void> {
  try {
    const st = await stat(targetAbs);
    if (!st.isFile()) {
      throw new MgrError({
        code: "IMPORT_NOT_FOUND",
        messageKey: "IMPORT_NOT_A_FILE",
        params: { path: d.arg },
        location: { file: importerAbs, line: d.location.line },
        directive: "@import",
      });
    }
  } catch (cause) {
    if (cause instanceof MgrError) throw cause;
    throw new MgrError({
      code: "IMPORT_NOT_FOUND",
      messageKey: "IMPORT_NOT_FOUND",
      params: { path: d.arg },
      location: { file: importerAbs, line: d.location.line },
      directive: "@import",
      cause,
    });
  }
}

/**
 * Iterative DFS topological sort with cycle detection.
 * Order: dependencies before dependents; children visited in the order
 * they appear in @import directives → the entry file appears LAST in
 * the returned array.
 */
function topologicalOrder(
  entry: string,
  edges: Map<string, string[]>,
): string[] {
  const order: string[] = [];
  const state = new Map<string, "pending" | "done">();
  const stack: Array<{ node: string; idx: number; path: string[] }> = [];

  stack.push({ node: entry, idx: 0, path: [entry] });
  state.set(entry, "pending");

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    const children = edges.get(frame.node) ?? [];
    if (frame.idx < children.length) {
      const child = children[frame.idx]!;
      frame.idx++;
      const s = state.get(child);
      if (s === "pending") {
        // Cycle: walk `path` from child index back to top.
        const cycleStart = frame.path.indexOf(child);
        const cycle =
          cycleStart >= 0
            ? [...frame.path.slice(cycleStart), child]
            : [child, ...frame.path, child];
        throw new MgrError({
          code: "DEPENDENCY_CYCLE",
          messageKey: "DEPENDENCY_CYCLE",
          params: { chain: cycle.join(" -> ") },
          location: { file: child },
        });
      }
      if (s === "done") continue;
      state.set(child, "pending");
      stack.push({ node: child, idx: 0, path: [...frame.path, child] });
    } else {
      state.set(frame.node, "done");
      order.push(frame.node);
      stack.pop();
    }
  }

  return order;
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}
