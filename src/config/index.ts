/**
 * MGR Config — mgr.config.json schema.
 *
 * Foundation only requires:
 *   - `entry`: the entry Markdown file (relative to `src`)
 *   - `out`: output file (relative to project root)
 *
 * PRD-008 adds Game Package metadata:
 *   - `author`, `description` — informative fields recorded in the
 *     Prompt Specification Metadata block.
 *   - `runtime` — target Runtime Spec version. Accepts a plain
 *     version (`1.3`), a major-only spec (`1`), or a wildcard
 *     range (`1.x`, `1.*`). Builder rejects the build when the
 *     shipped Runtime Spec cannot satisfy it (PRD-008 §16).
 */
import { z } from "zod";

const RUNTIME_TARGET_PATTERN = /^\d+(?:\.(?:\d+|\*|x|X))?$/;

export const MgrConfigSchema = z.object({
  name: z.string().min(1).default("untitled"),
  version: z.string().default("0.0.1"),
  entry: z.string().default("main.md"),
  srcDir: z.string().default("src"),
  outDir: z.string().default("dist"),
  // Output filename. When omitted, the pipeline derives it from
  // `name` + `version` via `resolveOutFilename` — a `hangman@0.1.0`
  // project builds to `dist/hangman-0.1.0.md`, not the ambiguous
  // `dist/game.md`. Set this explicitly to override.
  out: z.string().optional(),
  // PRD-008 §4 — Game Package Metadata.
  author: z.string().optional(),
  description: z.string().optional(),
  // PRD-008 §16 — Target Runtime spec version. Optional for
  // backward compatibility; when present, Builder checks it against
  // RUNTIME_SPEC_VERSION and fails the build on a mismatch.
  runtime: z
    .string()
    .regex(RUNTIME_TARGET_PATTERN, "Use a Runtime target like `1.x`, `1.3`, or `1`.")
    .optional(),
});

export type MgrConfig = z.infer<typeof MgrConfigSchema>;

export const DEFAULT_CONFIG: MgrConfig = MgrConfigSchema.parse({});

export function parseConfig(raw: unknown): MgrConfig {
  return MgrConfigSchema.parse(raw);
}

/**
 * Resolve the output filename for a config. When `out` is set, it is
 * used verbatim. When `out` is unset, the filename derives from
 * `name` + `version` so that the built spec carries its project
 * identity in the filesystem — `hangman@0.1.0` → `hangman-0.1.0.md`.
 *
 * Sanitization strips path separators and control characters so a
 * config value like `"foo/bar"` cannot escape `outDir`.
 */
export function resolveOutFilename(config: MgrConfig): string {
  if (config.out && config.out.length > 0) return config.out;
  const stem = sanitizeFilenamePart(config.name) || "game";
  const ver = sanitizeFilenamePart(config.version);
  return ver ? `${stem}-${ver}.md` : `${stem}.md`;
}

function sanitizeFilenamePart(raw: string): string {
  return raw
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
    .replace(/^[.\-]+/, "")
    .trim();
}

/**
 * PRD-008 §16 — decide whether the shipped Runtime Spec version
 * satisfies a Game Package's declared target.
 *
 * Accepted `target` forms:
 *   - `1`           — any 1.x runtime.
 *   - `1.x` / `1.*` — same as above.
 *   - `1.3`         — exact major.minor match.
 */
export function isRuntimeCompatible(
  runtimeVersion: string,
  target: string,
): boolean {
  const rt = parseVersion(runtimeVersion);
  if (!rt) return false;
  const trimmed = target.trim();
  const [rawMajor, rawMinor] = trimmed.split(".");
  const targetMajor = Number(rawMajor);
  if (!Number.isFinite(targetMajor)) return false;
  if (rt.major !== targetMajor) return false;
  if (rawMinor === undefined) return true;
  if (rawMinor === "*" || rawMinor.toLowerCase() === "x") return true;
  const targetMinor = Number(rawMinor);
  if (!Number.isFinite(targetMinor)) return false;
  return rt.minor === targetMinor;
}

function parseVersion(v: string): { major: number; minor: number } | null {
  const m = v.trim().match(/^(\d+)\.(\d+)(?:\..*)?$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]) };
}
