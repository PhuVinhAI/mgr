import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { parseSource } from "../src/parser/index.js";
import {
  createFoundationRegistry,
  RESERVED_DIRECTIVES,
} from "../src/parser/directives.js";
import { compile } from "../src/pipeline.js";
import { MgrError, MgrErrorList } from "../src/errors/index.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("parser block declarations (PRD-008 §15a)", () => {
  it("parses @variable with multi-line body into a BlockDeclarationNode", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: [
        "@section state",
        "",
        "@variable Money",
        "Visibility: Public",
        "Purpose:",
        "Player cash in cents.",
      ].join("\n"),
    });
    expect(doc.declarations).toHaveLength(1);
    const decl = doc.declarations[0]!;
    expect(decl.kind).toBe("variable");
    expect(decl.name).toBe("Money");
    expect(decl.body).toBe(
      "Visibility: Public\nPurpose:\nPlayer cash in cents.",
    );
    expect(decl.bodyLines).toHaveLength(3);
    // Lives inside the section, not at root.
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]!.body.some((b) => b.type === "declaration")).toBe(
      true,
    );
  });

  it("does NOT terminate the body at a blank line (next directive does)", () => {
    // Block bodies preserve blank lines so authors can separate field
    // paragraphs (e.g. a Purpose block after an HTML comment) without
    // losing the declaration. The body terminates at the next
    // `@`-directive, not at an intervening blank line.
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: [
        "@variable Money",
        "Visibility: Public",
        "",
        "Purpose:",
        "Player cash.",
        "",
        "@variable Day",
        "Visibility: Public",
      ].join("\n"),
    });
    expect(doc.declarations).toHaveLength(2);
    expect(doc.declarations[0]!.name).toBe("Money");
    expect(doc.declarations[0]!.body).toBe(
      "Visibility: Public\n\nPurpose:\nPlayer cash.",
    );
    expect(doc.declarations[1]!.name).toBe("Day");
  });

  it("terminates the body at the next @-directive", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: [
        "@variable Money",
        "Visibility: Public",
        "@variable Day",
        "Visibility: Public",
      ].join("\n"),
    });
    expect(doc.declarations).toHaveLength(2);
    expect(doc.declarations[0]!.body).toBe("Visibility: Public");
    expect(doc.declarations[1]!.body).toBe("Visibility: Public");
  });

  it("terminates the body at a markdown heading", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: [
        "@variable Money",
        "Visibility: Public",
        "## More",
        "",
        "@variable Day",
        "Visibility: Public",
      ].join("\n"),
    });
    expect(doc.declarations).toHaveLength(2);
    expect(doc.declarations[0]!.body).toBe("Visibility: Public");
    // The heading ends up as a markdown block in the AST, not part of
    // the declaration body.
    const more = doc.blocks
      .flatMap((b) => (b.type === "section" ? b.body : [b]))
      .find(
        (b) => b.type === "markdown" && b.value.includes("## More"),
      );
    expect(more).toBeDefined();
  });

  it("accepts every §15a block kind", () => {
    for (const kind of [
      "variable",
      "entity",
      "formula",
      "rule",
      "event",
      "action",
      "auto-action",
      "query",
    ]) {
      const doc = parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: `@${kind} Sample\nBody line.\n`,
      });
      expect(doc.declarations).toHaveLength(1);
      expect(doc.declarations[0]!.kind).toBe(kind);
      expect(doc.declarations[0]!.name).toBe("Sample");
      expect(doc.declarations[0]!.body).toBe("Body line.");
    }
  });

  it("accepts multi-word declaration names", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: ["@auto-action End Day", "Fires When: X = 0"].join("\n"),
    });
    expect(doc.declarations).toHaveLength(1);
    expect(doc.declarations[0]!.name).toBe("End Day");
  });

  it("rejects an empty name", () => {
    expect(() =>
      parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: "@variable\n",
      }),
    ).toThrowError(MgrError);
  });

  it("rejects a lowercase declaration name", () => {
    expect(() =>
      parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: "@variable money\n",
      }),
    ).toThrowError(MgrError);
  });

  it("trims trailing blank lines from the body", () => {
    // The parser should not record blank lines as body lines; the
    // body contract is contiguous non-blank lines.
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: "@variable Money\nVisibility: Public\n\n\n",
    });
    expect(doc.declarations[0]!.body).toBe("Visibility: Public");
  });

  it("records the body line locations for validator error reporting", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: [
        "@variable Money", // line 1
        "Visibility: Public", // line 2
        "Purpose:", // line 3
        "Player cash.", // line 4
      ].join("\n"),
    });
    const decl = doc.declarations[0]!;
    expect(decl.location.line).toBe(1);
    expect(decl.bodyLines).toHaveLength(3);
    expect(decl.bodyLines[0]!.line).toBe(2);
    expect(decl.bodyLines[1]!.line).toBe(3);
    expect(decl.bodyLines[2]!.line).toBe(4);
  });
});

describe("parser directive registry + reserved names", () => {
  it("does not block §15a names from being registered", () => {
    const r = createFoundationRegistry();
    for (const name of [
      "variable",
      "entity",
      "formula",
      "rule",
      "event",
      "action",
      "auto-action",
      "query",
    ]) {
      expect(r.has(name)).toBe(true);
    }
  });

  it("reserves names for PRDs not yet in Foundation", () => {
    expect(RESERVED_DIRECTIVES.has("include")).toBe(true);
    expect(RESERVED_DIRECTIVES.has("define")).toBe(true);
    expect(RESERVED_DIRECTIVES.has("guard")).toBe(true);
    expect(RESERVED_DIRECTIVES.has("intent")).toBe(true);
    expect(RESERVED_DIRECTIVES.has("visibility")).toBe(true);
    // Block directives that DO have handlers are no longer "reserved
    // only" — they appear in the registry. The reservation is kept so
    // extension code still rejects non-Foundation registrations.
    expect(RESERVED_DIRECTIVES.has("rule")).toBe(true);
    expect(RESERVED_DIRECTIVES.has("formula")).toBe(true);
  });
});

describe("§15a block directives through the pipeline", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("compiles a project that uses @variable, @rule, @action", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "demo", entry: "main.md" }),
      "src/main.md": [
        "@section state",
        "",
        "@variable Money",
        "Visibility: Public",
        "",
        "@section rules",
        "",
        "@rule Buy",
        "Kind: Transformation",
        "Trigger:",
        "On Action(Buy)",
        "Precondition:",
        "Money >= 5",
        "Effect:",
        "Money -= 5",
        "Purpose:",
        "Apply the Buy action.",
        "",
        "@section actions",
        "",
        "@action Buy",
        "Intent:",
        "buy",
        "Purpose:",
        "Buy something.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    // Bundler emits the §15a headers as prose-form `Variable Money`,
    // `Rule Buy`, `Action Buy` so the LLM sees a stable shape.
    expect(result.output).toContain("Variable Money");
    expect(result.output).toContain("Rule Buy");
    expect(result.output).toContain("Action Buy");
    // No `@` directives in the output (PRD-003 §16 Prompt Purity).
    expect(result.output).not.toContain("@variable");
    expect(result.output).not.toContain("@rule");
    expect(result.output).not.toContain("@action");
  });

  it("validates a missing Visibility on @variable (§15a.1)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-vis", entry: "main.md" }),
      "src/main.md": [
        "@section state",
        "",
        "@variable Money",
        "Purpose:",
        "Player cash.",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const codes = (err as MgrErrorList).errors.map((e) => e.code);
      expect(codes).toContain("SECTION_SCHEMA_MISSING_BLOCK");
    }
  });

  it("validates a Rule with no Kind via @rule (§15a.4)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-kind", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "@rule ApplyFoo",
        "Trigger:",
        "On Action(Foo)",
        "Precondition:",
        "true",
        "Effect:",
        "X += 1",
        "Purpose:",
        "Apply Foo.",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const codes = (err as MgrErrorList).errors.map((e) => e.code);
      expect(codes).toContain("SECTION_SCHEMA_MISSING_KIND");
    }
  });

  it("validates a Purpose-required @action at ERROR level (PRD-014 §4)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({
        name: "act-nop",
        entry: "main.md",
      }),
      "src/main.md": [
        "@section actions",
        "",
        "@action Buy",
        "Intent:",
        "buy",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const codes = (err as MgrErrorList).errors.map((e) => e.code);
      expect(codes).toContain("DOCUMENTATION_PURPOSE_MISSING");
    }
  });

  it("still validates the legacy prose form (§15a) for backward compat", async () => {
    // Sources that author declarations as plain markdown should keep
    // compiling. The validator scans both shapes.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "legacy", entry: "main.md" }),
      "src/main.md": [
        "@section state",
        "",
        "Variable Money",
        "Visibility: Public",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });

  it("validates a @formula body that is not an expression (§18a)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "fb", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "@formula Demand",
        "this is prose and not an expression",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(
      result.validation.warnings.some((w) => w.code === "FORMULA_BODY_INVALID"),
    ).toBe(true);
  });
});
