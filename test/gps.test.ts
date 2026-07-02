import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { compile } from "../src/pipeline.js";
import {
  parseConfig,
  isRuntimeCompatible,
} from "../src/config/index.js";
import { RUNTIME_SPEC_VERSION } from "../src/runtime/index.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("game package metadata (PRD-008 §4)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("parseConfig accepts author, description, and runtime target fields", () => {
    const cfg = parseConfig({
      name: "gdt",
      version: "1.0.0",
      entry: "main.md",
      author: "Ada",
      description: "Game Dev Tycoon-style clone",
      runtime: "1.x",
    });
    expect(cfg.author).toBe("Ada");
    expect(cfg.description).toBe("Game Dev Tycoon-style clone");
    expect(cfg.runtime).toBe("1.x");
  });

  it("parseConfig rejects malformed runtime targets", () => {
    expect(() =>
      parseConfig({ name: "x", entry: "main.md", runtime: "beta" }),
    ).toThrow();
  });

  it("author, description, and target runtime appear in Metadata", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "gdt",
        version: "0.1.0",
        entry: "main.md",
        author: "Ada Lovelace",
        description: "A studio management sim.",
        runtime: `${RUNTIME_SPEC_VERSION.split(".")[0]}.x`,
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.output).toContain("- Author: Ada Lovelace");
    expect(result.output).toContain(
      "- Description: A studio management sim.",
    );
    expect(result.output).toContain(
      `- Target Runtime: ${RUNTIME_SPEC_VERSION.split(".")[0]}.x`,
    );
  });

  it("omits optional Metadata lines when the fields are absent", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "min", entry: "main.md" }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.output).not.toContain("- Author:");
    expect(result.output).not.toContain("- Description:");
    expect(result.output).not.toContain("- Target Runtime:");
  });
});

describe("runtime compatibility check (PRD-008 §16)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("isRuntimeCompatible handles major-only, wildcard, and exact targets", () => {
    // Same major always matches "1" and "1.x" / "1.*".
    expect(isRuntimeCompatible("1.3", "1")).toBe(true);
    expect(isRuntimeCompatible("1.3", "1.x")).toBe(true);
    expect(isRuntimeCompatible("1.3", "1.*")).toBe(true);
    expect(isRuntimeCompatible("1.3", "1.X")).toBe(true);
    // Exact major.minor match.
    expect(isRuntimeCompatible("1.3", "1.3")).toBe(true);
    expect(isRuntimeCompatible("1.3", "1.2")).toBe(false);
    // Different major always fails.
    expect(isRuntimeCompatible("1.3", "2.x")).toBe(false);
    expect(isRuntimeCompatible("2.0", "1")).toBe(false);
    // Malformed runtime string.
    expect(isRuntimeCompatible("nope", "1.x")).toBe(false);
  });

  it("build succeeds when the declared runtime matches the shipped spec", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "compat",
        entry: "main.md",
        runtime: RUNTIME_SPEC_VERSION,
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });

  it("build fails RUNTIME_INCOMPATIBLE when the target major diverges", async () => {
    // Pick a major that cannot match the shipped one.
    const shippedMajor = Number(RUNTIME_SPEC_VERSION.split(".")[0] ?? "1");
    const badMajor = shippedMajor + 1;
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "incompat",
        entry: "main.md",
        runtime: `${badMajor}.x`,
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    await expect(compile({ root })).rejects.toMatchObject({
      code: "RUNTIME_INCOMPATIBLE",
      messageKey: "RUNTIME_INCOMPATIBLE",
    });
  });

  it("build without a declared runtime target is allowed (backward compat)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "no-target",
        entry: "main.md",
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.output).not.toContain("- Target Runtime:");
  });
});
