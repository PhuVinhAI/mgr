import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { compile } from "../src/pipeline.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("pipeline", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("compiles a minimal project into a single output file", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "smoke",
        entry: "main.md",
      }),
      "src/main.md": "# Hello\n\n@import intro.md\n",
      "src/intro.md": "@section intro\n\nHello from intro.\n",
    });

    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(result.graph.documents.size).toBe(2);
    const written = await readFile(result.outputPath, "utf8");
    // PSF envelope must be present (PRD-003 §13, §14, §15).
    expect(written).toContain("# smoke");
    expect(written).toContain("## Metadata");
    expect(written).toContain("## Table of Contents");
    expect(written).toContain("# INTRO");
    expect(written).toContain("Hello from intro.");
    // Free markdown outside a section becomes the PREAMBLE.
    expect(written).toContain("# PREAMBLE");
    expect(written).toContain("# Hello");
    // §16 Prompt Purity: no @import in output.
    expect(written).not.toContain("@import");
  });

  it("produces the exact same output for the same source (deterministic)", async () => {
    const files = {
      "mgr.config.json": JSON.stringify({ name: "d", entry: "main.md" }),
      "src/main.md": "@import a.md\n\n@import b.md\n",
      "src/a.md": "@section a\n\nA body\n",
      "src/b.md": "@section b\n\nB body\n",
    };
    const r1 = await makeProject(files);
    const r2 = await makeProject(files);
    const buildDate = new Date(0);
    const b1 = await compile({ root: r1, buildDate });
    const b2 = await compile({ root: r2, buildDate });
    expect(b1.output).toBe(b2.output);
    await rm(r1, { recursive: true, force: true });
    await rm(r2, { recursive: true, force: true });
  });

  it("reports missing @import target with file+line", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "e", entry: "main.md" }),
      "src/main.md": "@import missing.md\n",
    });
    await expect(compile({ root })).rejects.toMatchObject({
      code: "IMPORT_NOT_FOUND",
      messageKey: "IMPORT_NOT_FOUND",
      directive: "@import",
    });
  });

  it("detects duplicate section ids across files", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "d", entry: "main.md" }),
      "src/main.md": "@import a.md\n\n@import b.md\n",
      "src/a.md": "@section shared\n\nA\n",
      "src/b.md": "@section shared\n\nB\n",
    });
    await expect(compile({ root })).rejects.toMatchObject({
      name: "MgrErrorList",
    });
  });

  it("detects @import cycles", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "c", entry: "main.md" }),
      "src/main.md": "@import a.md\n",
      "src/a.md": "@import b.md\n",
      "src/b.md": "@import a.md\n",
    });
    await expect(compile({ root })).rejects.toMatchObject({
      code: "DEPENDENCY_CYCLE",
    });
  });

  it("defaults output filename to <name>-<version>.md when `out` is unset", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "hangman",
        version: "0.1.0",
        entry: "main.md",
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(path.basename(result.outputPath)).toBe("hangman-0.1.0.md");
    // The file physically exists at the derived path.
    const written = await readFile(result.outputPath, "utf8");
    expect(written).toContain("# hangman");
  });

  it("honors explicit `out` in config over the derived default", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "hangman",
        version: "0.1.0",
        entry: "main.md",
        out: "spec.md",
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(path.basename(result.outputPath)).toBe("spec.md");
  });

  it("sanitizes name and version so they cannot escape outDir", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        // Path separators + control chars in name; version with a slash.
        name: "../evil/name",
        version: "1.0/0",
        entry: "main.md",
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    const base = path.basename(result.outputPath);
    expect(base).not.toContain("/");
    expect(base).not.toContain("\\");
    expect(base).toBe("evil-name-1.0-0.md");
  });
});
