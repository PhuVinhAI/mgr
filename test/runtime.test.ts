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
import {
  CONTRACT_SECTIONS,
  CONTRACT_SPEC_VERSION,
  isContractSection,
  contractSectionBody,
} from "../src/contracts/index.js";

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
    // PRD-004 §18: UI, State Schema, and the response envelope are
    // NON-goals of the Runtime Specification. Only behavior sections
    // live in the runtime catalog; the presentation contracts moved
    // to src/contracts/ (see contracts.test.ts).
    const ids = RUNTIME_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      "runtime",
      "turn-loop",
      "state-machine",
      "memory-model",
      "validation",
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

  it("keeps runtime and contract layers disjoint", () => {
    // The design split lives here: presentation section ids must NOT
    // resolve through the runtime catalog, and runtime section ids
    // must NOT resolve through the contract catalog. If someone moves
    // a section without updating the other module, this test breaks.
    for (const id of ["ui-contract", "state-contract", "output-contract"]) {
      expect(isRuntimeSection(id)).toBe(false);
      expect(runtimeSectionBody(id)).toBeUndefined();
      expect(isContractSection(id)).toBe(true);
      expect(contractSectionBody(id)).toBeDefined();
    }
    for (const id of [
      "runtime",
      "turn-loop",
      "state-machine",
      "memory-model",
      "validation",
    ]) {
      expect(isContractSection(id)).toBe(false);
      expect(contractSectionBody(id)).toBeUndefined();
    }
  });
});

describe("runtime injection into bundle (PRD-004 §4, §7, §12, §15)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("auto-injects all runtime sections into a minimal build", async () => {
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
    expect(result.output).toMatch(/^---\n\n# UI CONTRACT$/m);
    expect(result.output).toMatch(/^---\n\n# STATE CONTRACT$/m);
    expect(result.output).toMatch(/^---\n\n# OUTPUT CONTRACT$/m);

    // The canonical turn-loop body encodes PRD-004 §4 literally.
    expect(result.output).toContain("1. LOAD SPECIFICATION");
    // 11 steps after PRD-005 §7/§7a split Event into Pre and Post.
    expect(result.output).toContain("11. WAIT NEXT TURN");

    // PRD-011 §3 execution model semantics live in the turn-loop body.
    expect(result.output).toContain("Rule execution within a phase.");
    expect(result.output).toContain("Each rule applies as a unit.");

    // PRD-012 §3 Action Resolution — intent matching before Guard.
    expect(result.output).toContain("intent matching");
    expect(result.output).toContain("reserved intents");

    // PRD-014 Documentation Schema — Purpose + Failure are runtime-
    // relevant even though they are pure documentation.
    expect(result.output).toContain("Rule documentation.");
    expect(result.output).toContain("Purpose block");
    expect(result.output).toContain("Failure blocks");

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
    // PSF §11 places ui-contract before state-contract, then output-contract.
    expect(result.bundle.sectionOrder).toEqual([
      "system",
      "runtime",
      "turn-loop",
      "state-machine",
      "memory-model",
      "validation",
      "ui-contract",
      "state-contract",
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
    expect(at("UI CONTRACT")).toBeGreaterThan(at("VALIDATION"));
    expect(at("STATE CONTRACT")).toBeGreaterThan(at("UI CONTRACT"));
    expect(at("OUTPUT CONTRACT")).toBeGreaterThan(at("STATE CONTRACT"));
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
    expect(result.output).toContain(
      `- Contract Spec Version: ${CONTRACT_SPEC_VERSION}`,
    );
    // Version tracks the shape of the bodies. Bumped to 2.0 when the
    // UI/State/Output contracts moved out of the runtime module.
    expect(RUNTIME_SPEC_VERSION).toBe("2.0");
    expect(CONTRACT_SPEC_VERSION).toBe("1.0");
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

  it("turn-loop body carries the seven-phase transaction model", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "tl", entry: "main.md" }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    const tl = runtimeSectionBody("turn-loop") ?? "";

    // §3 architecture — every phase must be named, including the
    // Pre/Post Event split added in v1.1.
    for (const phase of [
      "Input Phase",
      "Validation Phase",
      "Pre Event Phase",
      "Simulation Phase",
      "Post Event Phase",
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
    // at most once; no event after commit; Pre/Post queues distinct.
    expect(tl).toContain("Response does not modify state.");
    expect(tl).toContain("State commits at most once per turn.");
    expect(tl).toContain("No event runs after Commit.");
    expect(tl).toContain("Pre Event runs before Simulation.");
    expect(tl).toContain("Post Event runs before Commit.");
    expect(tl).toContain("Pre and Post event queues are distinct.");
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

describe("state system content (PRD-006)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("state-machine body carries SSoT and snapshot model", async () => {
    const sm = runtimeSectionBody("state-machine") ?? "";
    // §2 — single source of truth.
    expect(sm).toContain("State as single source of truth.");
    expect(sm.toLowerCase()).toContain("never infer from narrative");
    // §3 — snapshot semantics.
    expect(sm).toContain("State as snapshot.");
    expect(sm).toContain("exactly one new snapshot");
  });

  it("state-contract body encodes the building blocks and layers", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "sc",
        entry: "main.md",
      }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    // state-contract now lives in the contracts catalog, not runtime.
    const sc = contractSectionBody("state-contract") ?? "";

    // §5–§10 building blocks are all mentioned by name.
    for (const kind of [
      "Entity",
      "Property",
      "Collection",
      "Flag",
      "Variable",
      "Relationship",
    ]) {
      expect(sc).toContain(`- ${kind}.`);
    }

    // §11 + §11a (v1.1) — three-level visibility with declaration.
    expect(sc).toContain("Public, private, and hidden state.");
    expect(sc).toContain("The game package declares visibility.");

    // §16 visibility levels.
    expect(sc).toContain("- Public");
    expect(sc).toContain("- Private");
    expect(sc).toContain("- Hidden");

    // §5a (v1.1) — Transient Entity.
    expect(sc).toContain("Persistent and transient entities.");
    expect(sc).toContain("Kind: Transient");
    expect(sc).toContain("Lifetime: Simulation Phase");

    // §12 mutation constraint.
    expect(sc).toContain("only changes at the State Commit");
    expect(sc.toLowerCase()).toContain("never mutate state");

    // §14 example invariants.
    expect(sc).toContain("Money >= 0");
    expect(sc).toContain("HP <= MaxHP");

    // §17 history read-only.
    expect(sc).toContain("State history.");
    expect(sc).toContain("read-only");

    // §18 Markdown, no JSON.
    expect(sc).toContain("Serialization.");
    expect(sc).toContain("never rely on JSON");

    // §19 ownership.
    expect(sc).toContain("Ownership.");
    expect(sc).toContain("Only the runtime may create, modify, or delete state.");

    // PRD-013 §3 Query/Selector semantics — pure, read-only, snapshot-scoped.
    expect(sc).toContain("Queries and selectors.");
    expect(sc).toContain("Collection where Predicate");
    expect(sc).toContain("they never mutate");

    // The bundle actually emits the heading with the canonical body.
    expect(result.output).toMatch(/^---\n\n# STATE CONTRACT$/m);
    expect(result.output).toContain("Serialization.");
    expect(result.output).toContain("Money >= 0");
  });

  it("author-supplied state-contract overrides the canonical body", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "sc-over",
        entry: "main.md",
      }),
      "src/main.md": [
        "@section state-contract",
        "",
        "AUTHOR STATE CONTRACT.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    const occurrences =
      result.output.match(/^# STATE CONTRACT$/gm)?.length ?? 0;
    expect(occurrences).toBe(1);
    expect(result.output).toContain("AUTHOR STATE CONTRACT.");
    // The canonical serialization clause must NOT appear when the
    // author has overridden the section.
    expect(result.output).not.toContain("never rely on JSON");
  });
});

describe("ui contract content (PRD-007)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("ui-contract body encodes the 7-part layout in order", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "ui", entry: "main.md" }),
      "src/main.md": "@section system\n\nS\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    const ui = contractSectionBody("ui-contract") ?? "";

    // §4 — the 7 layout slots by name.
    expect(ui).toMatch(/1\. Narrative/);
    expect(ui).toMatch(/2\. Events/);
    expect(ui).toMatch(/3\. Dashboard/);
    expect(ui).toMatch(/4\. Details/);
    expect(ui).toMatch(/5\. Available Actions/);
    expect(ui).toMatch(/6\. Prompt/);
    expect(ui).toMatch(/7\. State Snapshot/);

    // Ordering constraint holds in the rendered bundle too.
    const at = (needle: string): number => result.output.indexOf(needle);
    expect(at("1. Narrative")).toBeGreaterThan(0);
    expect(at("2. Events")).toBeGreaterThan(at("1. Narrative"));
    expect(at("3. Dashboard")).toBeGreaterThan(at("2. Events"));
    expect(at("7. State Snapshot")).toBeGreaterThan(at("6. Prompt"));
  });

  it("ui-contract body forbids HTML and CSS, allows standard Markdown", async () => {
    const ui = contractSectionBody("ui-contract") ?? "";
    // §12 allowlist + prohibitions.
    expect(ui).toContain("Do not use HTML.");
    expect(ui).toMatch(/Do not\s+depend on CSS\./);
    for (const feature of [
      "headings",
      "tables",
      "lists",
      "blockquotes",
      "bold",
      "italic",
      "horizontal rules",
      "code blocks",
    ]) {
      expect(ui).toContain(feature);
    }
  });

  it("ui-contract body masks hidden state and preserves layout on error", async () => {
    const ui = contractSectionBody("ui-contract") ?? "";
    // §15 hidden info masking symbols.
    expect(ui).toContain("`???`");
    expect(ui).toContain("`Unknown`");
    // §16 error UI keeps everything except narrative slot.
    expect(ui).toContain("Error UI.");
    expect(ui).toContain("the layout does not change");
  });

  it("ui-contract body lists the seven UI invariants", async () => {
    const ui = contractSectionBody("ui-contract") ?? "";
    // §19 invariants.
    for (const line of [
      "- Narrative is present.",
      "- Dashboard is present.",
      "- Available Actions is present.",
      "- Prompt is present.",
      "- State Snapshot is present.",
      "- No hidden state is rendered.",
      "- The layout does not change.",
    ]) {
      expect(ui).toContain(line);
    }
  });

  it("author-supplied ui-contract overrides the canonical body", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "ui-over",
        entry: "main.md",
      }),
      "src/main.md": [
        "@section ui-contract",
        "",
        "AUTHOR UI CONTRACT.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    const occurrences =
      result.output.match(/^# UI CONTRACT$/gm)?.length ?? 0;
    expect(occurrences).toBe(1);
    expect(result.output).toContain("AUTHOR UI CONTRACT.");
    expect(result.output).not.toContain("Renderer independence.");
  });
});
