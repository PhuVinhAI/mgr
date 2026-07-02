/**
 * Validator.
 *
 * Rules Foundation enforces (PRD §6 · Validator):
 *   1. Duplicate section ids across the whole project.
 *   2. Empty project (entry loaded but no content).
 *   3. Section Schema declarations (PRD-008 §15a) — every Rule /
 *      Entity / Variable / Formula / Event / Action / Query
 *      declaration carries its required blocks and no forbidden ones.
 *
 * Rules already caught earlier in the pipeline:
 *   - Missing file / bad import → graph builder.
 *   - Unknown directive / syntax → parser.
 *   - Dependency cycle → graph builder.
 *
 * The validator never mutates the graph; it only reports.
 */
import * as path from "node:path";
import { MgrError, MgrErrorList } from "../errors/index.js";
import type { ProjectGraph } from "../graph/index.js";
import type { SectionNode } from "../parser/ast.js";
import { validateSectionSchema } from "./schema.js";

export { validateSectionSchema };

export interface ValidateResult {
  ok: boolean;
  errors: MgrError[];
  warnings: MgrError[];
}

export function validate(graph: ProjectGraph): ValidateResult {
  const errors: MgrError[] = [];
  const warnings: MgrError[] = [];

  // 1. Duplicate section ids.
  const firstSeen = new Map<
    string,
    { file: string; section: SectionNode }
  >();
  for (const relPath of graph.order) {
    const doc = graph.documents.get(relPath);
    if (!doc) continue;
    for (const section of doc.sections) {
      const key = section.id;
      const prior = firstSeen.get(key);
      if (prior) {
        errors.push(
          new MgrError({
            code: "DUPLICATE_SECTION",
            messageKey: "DUPLICATE_SECTION",
            params: {
              id: section.id,
              origin: `${prior.file}:${prior.section.location.line}`,
            },
            location: {
              file: path.join(graph.srcDir, doc.relPath),
              line: section.location.line,
            },
            directive: "@section",
          }),
        );
      } else {
        firstSeen.set(key, { file: doc.relPath, section });
      }
    }
  }

  // 2. Empty project.
  const nonEmpty = graph.order.some((rel) => {
    const doc = graph.documents.get(rel);
    if (!doc) return false;
    return doc.blocks.length > 0;
  });
  if (!nonEmpty) {
    errors.push(
      new MgrError({
        code: "EMPTY_PROJECT",
        messageKey: "EMPTY_PROJECT",
        location: {
          file: path.join(graph.srcDir, graph.entry),
        },
      }),
    );
  }

  // 3. Section Schema (PRD-008 §15a).
  const schema = validateSectionSchema(graph);
  errors.push(...schema.errors);
  warnings.push(...schema.warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/** Throw a MgrErrorList when validation fails. */
export function assertValid(result: ValidateResult): void {
  if (!result.ok) throw new MgrErrorList(result.errors);
}
