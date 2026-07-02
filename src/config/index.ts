/**
 * MGR Config — mgr.config.json schema.
 *
 * Foundation only requires:
 *   - `entry`: the entry Markdown file (relative to `src`)
 *   - `out`: output file (relative to project root)
 * Everything else is reserved for future PRDs.
 */
import { z } from "zod";

export const MgrConfigSchema = z.object({
  name: z.string().min(1).default("untitled"),
  version: z.string().default("0.0.1"),
  entry: z.string().default("main.md"),
  srcDir: z.string().default("src"),
  outDir: z.string().default("dist"),
  out: z.string().default("game.md"),
});

export type MgrConfig = z.infer<typeof MgrConfigSchema>;

export const DEFAULT_CONFIG: MgrConfig = MgrConfigSchema.parse({});

export function parseConfig(raw: unknown): MgrConfig {
  return MgrConfigSchema.parse(raw);
}
