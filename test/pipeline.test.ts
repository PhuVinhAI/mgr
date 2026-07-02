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

    const result = await compile({ root });
    expect(result.validation.ok).toBe(true);
    expect(result.graph.documents.size).toBe(2);
    const written = await readFile(result.outputPath, "utf8");
    expect(written).toContain("# Hello");
    expect(written).toContain("## intro");
    expect(written).toContain("Hello from intro.");
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
    const b1 = await compile({ root: r1 });
    const b2 = await compile({ root: r2 });
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
});
