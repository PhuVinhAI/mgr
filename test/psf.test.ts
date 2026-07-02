import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { compile } from "../src/pipeline.js";
import {
  PSF_SECTIONS,
  PSF_SPEC_VERSION,
  psfSectionRank,
  psfSectionTitle,
  canonicalizeSectionId,
} from "../src/psf/index.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("psf catalog (PRD-003 §11–12)", () => {
  it("catalog matches the §11 canonical section order verbatim", () => {
    const ids = PSF_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      "system",
      "identity",
      "mission",
      "global-constraints",
      "runtime",
      "turn-loop",
      "state-machine",
      "memory-model",
      "validation",
      "ui-contract",
      "state-contract",
      "game",
      "world",
      "entities",
      "rules",
      "events",
      "start-state",
      "output-contract",
      "first-turn",
    ]);
  });

  it("psfSectionRank treats underscores, hyphens and camelCase as equivalent", () => {
    // Users may write @section state_machine, @section state-machine,
    // or @section stateMachine — all three must map to the same slot.
    expect(psfSectionRank("state-machine")).toBe(6);
    expect(psfSectionRank("state_machine")).toBe(6);
    expect(psfSectionRank("stateMachine")).toBe(6);
    expect(psfSectionRank("STATE-MACHINE")).toBe(6);
    expect(psfSectionRank("random-thing")).toBe(-1);
  });

  it("psfSectionTitle returns the PRD title for canonical ids and uppercases customs", () => {
    expect(psfSectionTitle("system")).toBe("SYSTEM");
    expect(psfSectionTitle("state-machine")).toBe("STATE MACHINE");
    expect(psfSectionTitle("custom-notes")).toBe("CUSTOM NOTES");
  });

  it("canonicalizeSectionId collapses separators without touching content", () => {
    expect(canonicalizeSectionId("StateMachine")).toBe("state-machine");
    expect(canonicalizeSectionId("state_machine")).toBe("state-machine");
    expect(canonicalizeSectionId("state-machine")).toBe("state-machine");
  });
});

describe("psf bundle envelope (PRD-003 §13, §14, §15)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("emits Metadata, TOC, and section boundaries for every build", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "envelope",
        version: "0.2.0",
        entry: "main.md",
      }),
      "src/main.md": [
        "@section system",
        "",
        "You are the runtime.",
        "",
        "@section game",
        "",
        "World: a tavern.",
      ].join("\n"),
    });

    const result = await compile({
      root,
      buildDate: new Date("2026-07-02T00:00:00.000Z"),
    });

    // §14 Metadata is present with every required field.
    expect(result.output).toContain("## Metadata");
    expect(result.output).toContain("- Project: envelope");
    expect(result.output).toContain("- Version: 0.2.0");
    expect(result.output).toContain(
      "- Build Date: 2026-07-02T00:00:00.000Z",
    );
    expect(result.output).toContain(
      `- Specification Version: ${PSF_SPEC_VERSION}`,
    );

    // §13 TOC lists every emitted section by display title.
    expect(result.output).toContain("## Table of Contents");
    expect(result.output).toMatch(/^\d+\. SYSTEM$/m);
    expect(result.output).toMatch(/^\d+\. GAME$/m);

    // §15 Prompt Boundary between sections — `---` before every
    // level-1 section header.
    expect(result.output).toMatch(/^---\n\n# SYSTEM$/m);
    expect(result.output).toMatch(/^---\n\n# GAME$/m);
  });
});

describe("psf section order is fixed (PRD-003 §11, §17)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("re-sorts sections into §11 order even when source order is reversed", async () => {
    // Source declares sections in reverse §11 order; output must
    // reorder them back to the canonical spine.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "order", entry: "main.md" }),
      "src/main.md": [
        "@section first-turn",
        "",
        "First turn body.",
        "",
        "@section output-contract",
        "",
        "Output contract body.",
        "",
        "@section system",
        "",
        "System body.",
      ].join("\n"),
    });

    const result = await compile({ root, buildDate: new Date(0) });
    const systemAt = result.output.indexOf("# SYSTEM");
    const outputAt = result.output.indexOf("# OUTPUT CONTRACT");
    const firstAt = result.output.indexOf("# FIRST TURN");
    expect(systemAt).toBeGreaterThan(0);
    expect(outputAt).toBeGreaterThan(systemAt);
    expect(firstAt).toBeGreaterThan(outputAt);
  });

  it("places non-canonical sections after all canonical ones, in appearance order", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "mix", entry: "main.md" }),
      "src/main.md": [
        "@section notes",
        "",
        "Notes body.",
        "",
        "@section system",
        "",
        "System body.",
        "",
        "@section trivia",
        "",
        "Trivia body.",
      ].join("\n"),
    });

    const result = await compile({ root, buildDate: new Date(0) });
    const systemAt = result.output.indexOf("# SYSTEM");
    const notesAt = result.output.indexOf("# NOTES");
    const triviaAt = result.output.indexOf("# TRIVIA");
    expect(systemAt).toBeGreaterThan(0);
    expect(notesAt).toBeGreaterThan(systemAt);
    expect(triviaAt).toBeGreaterThan(notesAt);
  });
});

describe("psf prompt purity (PRD-003 §16)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("drops @import directives and compiler HTML comments from the output", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "pure", entry: "main.md" }),
      "src/main.md": [
        "@import runtime.md",
        "",
        "@section system",
        "",
        "System body.",
      ].join("\n"),
      "src/runtime.md": "@section runtime\n\nRuntime body.\n",
    });

    const result = await compile({ root, buildDate: new Date(0) });
    // No leftover directive syntax.
    expect(result.output).not.toContain("@import");
    // No compiler-authored HTML comments.
    expect(result.output).not.toMatch(/<!--\s*file:/);
    expect(result.output).not.toMatch(/<!--/);
    // Bodies still made it through.
    expect(result.output).toContain("System body.");
    expect(result.output).toContain("Runtime body.");
  });
});
