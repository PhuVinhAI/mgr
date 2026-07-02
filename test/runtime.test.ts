import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { compile } from "../src/pipeline.js";
import {
  RUNTIME_SECTIONS,
  RUNTIME_SPEC_VERSION,
  isRuntimeSection,
  runtimeSectionBody,
} from "../src/runtime/index.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("runtime catalog (PRD-004)", () => {
  it("ships canonical bodies for every Runtime Layer id", () => {
    const ids = RUNTIME_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      "runtime",
      "turn-loop",
      "state-machine",
      "memory-model",
      "validation",
      "output-contract",
    ]);
  });

  it("classifies runtime ids and returns bodies by id", () => {
    expect(isRuntimeSection("runtime")).toBe(true);
    expect(isRuntimeSection("turn-loop")).toBe(true);
    expect(isRuntimeSection("game")).toBe(false);
    expect(isRuntimeSection("nonsense")).toBe(false);
    expect(runtimeSectionBody("turn-loop")).toContain("LOAD SPECIFICATION");
    expect(runtimeSectionBody("game")).toBeUndefined();
  });
});

describe("runtime injection into bundle (PRD-004 §4, §7, §12, §15)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("auto-injects all six runtime sections into a minimal build", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "min",
        entry: "main.md",
      }),
      "src/main.md": ["@section system", "", "You are the runtime."].join(
        "\n",
      ),
    });

    const result = await compile({ root, buildDate: new Date(0) });

    // Every canonical Runtime Layer heading appears in the output.
    expect(result.output).toMatch(/^---\n\n# RUNTIME$/m);
    expect(result.output).toMatch(/^---\n\n# TURN LOOP$/m);
    expect(result.output).toMatch(/^---\n\n# STATE MACHINE$/m);
    expect(result.output).toMatch(/^---\n\n# MEMORY MODEL$/m);
    expect(result.output).toMatch(/^---\n\n# VALIDATION$/m);
    expect(result.output).toMatch(/^---\n\n# OUTPUT CONTRACT$/m);

    // The canonical turn-loop body encodes PRD-004 §4 literally.
    expect(result.output).toContain("1. LOAD SPECIFICATION");
    expect(result.output).toContain("10. WAIT NEXT TURN");

    // Authority order from §7 is present in the state-machine body.
    expect(result.output).toContain("1. System Layer");
    expect(result.output).toContain("5. Player Input");

    // Memory model lists the four Runtime Context sources (§5, §12).
    expect(result.output).toContain("- The specification.");
    expect(result.output).toContain("- The player's input.");

    // Output Contract fixes the 5-part response order (§15).
    expect(result.output).toMatch(/1\. Narrative/);
    expect(result.output).toMatch(/5\. Await Player Input/);

    // Bundle result reports the injected sections in canonical order.
    expect(result.bundle.sectionOrder).toEqual([
      "system",
      "runtime",
      "turn-loop",
      "state-machine",
      "memory-model",
      "validation",
      "output-contract",
    ]);
  });

  it("keeps sections in PSF §11 canonical order after injection", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "order",
        entry: "main.md",
      }),
      "src/main.md": [
        "@section first-turn",
        "",
        "First turn body.",
        "",
        "@section system",
        "",
        "System body.",
      ].join("\n"),
    });

    const result = await compile({ root, buildDate: new Date(0) });
    const at = (h: string): number => result.output.indexOf(`# ${h}`);

    expect(at("SYSTEM")).toBeGreaterThan(0);
    expect(at("RUNTIME")).toBeGreaterThan(at("SYSTEM"));
    expect(at("TURN LOOP")).toBeGreaterThan(at("RUNTIME"));
    expect(at("STATE MACHINE")).toBeGreaterThan(at("TURN LOOP"));
    expect(at("MEMORY MODEL")).toBeGreaterThan(at("STATE MACHINE"));
    expect(at("VALIDATION")).toBeGreaterThan(at("MEMORY MODEL"));
    expect(at("OUTPUT CONTRACT")).toBeGreaterThan(at("VALIDATION"));
    expect(at("FIRST TURN")).toBeGreaterThan(at("OUTPUT CONTRACT"));
  });

  it("author-supplied runtime section overrides the canonical body", async () => {
    // PRD-003 §12: the section id is the merge key. When the author
    // writes `@section turn-loop`, their content lives in that slot;
    // MGR does not append a second synthesized copy.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "over",
        entry: "main.md",
      }),
      "src/main.md": [
        "@section turn-loop",
        "",
        "AUTHOR OVERRIDE — custom loop.",
      ].join("\n"),
    });

    const result = await compile({ root, buildDate: new Date(0) });

    // Only one TURN LOOP heading exists.
    const occurrences =
      result.output.match(/^# TURN LOOP$/gm)?.length ?? 0;
    expect(occurrences).toBe(1);

    // Author content is used; the canonical body is NOT emitted here.
    expect(result.output).toContain("AUTHOR OVERRIDE");
    expect(result.output).not.toContain("1. LOAD SPECIFICATION");

    // Non-overridden runtime sections still get their canonical body.
    expect(result.output).toContain("1. System Layer");
    expect(result.output).toContain("- The player's input.");
  });

  it("records Runtime Spec Version in Metadata", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "meta",
        entry: "main.md",
      }),
      "src/main.md": "@section system\n\nS\n",
    });

    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.output).toContain(
      `- Runtime Spec Version: ${RUNTIME_SPEC_VERSION}`,
    );
    // Version tracks the shape of the bodies. PRD-005 bumped it to 1.1.
    expect(RUNTIME_SPEC_VERSION).toBe("1.1");
  });

  it("stays deterministic across two builds with the same source", async () => {
    const files = {
      "mgr.config.json": JSON.stringify({ name: "det", entry: "main.md" }),
      "src/main.md": "@section system\n\nS\n",
    };
    const r1 = await makeProject(files);
    const r2 = await makeProject(files);
    try {
      const buildDate = new Date(0);
      const a = await compile({ root: r1, buildDate });
      const b = await compile({ root: r2, buildDate });
      expect(a.output).toBe(b.output);
    } finally {
      await rm(r1, { recursive: true, force: true });
      await rm(r2, { recursive: true, force: true });
    }
  });
});

describe("turn lifecycle content (PRD-005)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("turn-loop body carries the six-phase transaction model", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "tl", entry: "main.md" }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    const tl = runtimeSectionBody("turn-loop") ?? "";

    // §3 architecture — every phase must be named.
    for (const phase of [
      "Input Phase",
      "Validation Phase",
      "Simulation Phase",
      "Event Phase",
      "State Commit",
      "Response Phase",
    ]) {
      expect(tl).toContain(phase);
      expect(result.output).toContain(phase);
    }

    // §8 rule resolution order.
    expect(tl).toContain(
      "System Rule → Runtime Rule → Game Rule → Event Rule",
    );

    // §16 nested-events bound.
    expect(tl.toLowerCase()).toContain("bounded depth");
    expect(tl.toLowerCase()).toContain("parallel");

    // §20 invariants — Response never modifies state; commit happens
    // at most once; no event after commit.
    expect(tl).toContain("Response does not modify state.");
    expect(tl).toContain("State commits at most once per turn.");
    expect(tl).toContain("No event runs after Commit.");
  });

  it("state-machine body encodes atomicity, idempotency, side effects", async () => {
    const sm = runtimeSectionBody("state-machine") ?? "";
    expect(sm).toContain("Atomicity.");
    expect(sm).toContain("Idempotency.");
    expect(sm).toContain("Side effects.");
    // §14 — response, UI, narrative are forbidden as side-effect sources.
    expect(sm).toMatch(/Response\s+Phase, the UI, and the narrative/);
    // §13 — no double credit, no double event fire.
    expect(sm).toContain("Do not credit resources twice.");
    expect(sm).toMatch(/Do not fire\s+an event twice\./);
  });

  it("memory-model body records immutable turn history", async () => {
    const mm = runtimeSectionBody("memory-model") ?? "";
    expect(mm).toContain("Turn history.");
    expect(mm).toContain("immutable");
    expect(mm).toContain("Never edit a past turn.");
  });

  it("validation body enforces narrative timing and failure recovery", async () => {
    const v = runtimeSectionBody("validation") ?? "";
    expect(v).toContain("Failure recovery.");
    expect(v).toContain("Narrative timing.");
    // §18 — never narrate a success then retract.
    expect(v.toLowerCase()).toContain("never describe an outcome before");
  });
});
