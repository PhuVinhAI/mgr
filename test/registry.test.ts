import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  DirectiveRegistry,
  RESERVED_DIRECTIVES,
  createFoundationRegistry,
} from "../src/parser/directives.js";
import { parseSource } from "../src/parser/index.js";
import { compile } from "../src/pipeline.js";
import { MgrError } from "../src/errors/index.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("directive registry (PRD-002 §14)", () => {
  it("Foundation registry only ships @import and @section", () => {
    const r = createFoundationRegistry();
    expect(r.names().sort()).toEqual(["import", "section"]);
  });

  it("recognizes a directive registered from outside the parser", () => {
    // PRD-002 §14: registering a new directive must NOT require any
    // parser change. If it did, this test would need to import from
    // src/parser/index.ts internals.
    const r = createFoundationRegistry();
    let seen = "";
    r.register({
      name: "author",
      category: "metadata",
      handler: (ctx) => {
        seen = ctx.arg;
        return {
          type: "directive",
          name: "author",
          arg: ctx.arg,
          location: ctx.location,
        };
      },
    });
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: "@author Jane\n\n# Body\n",
      registry: r,
    });
    expect(seen).toBe("Jane");
    // Author directive is stored as a leaf block; body follows.
    expect(doc.blocks.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects registration of a reserved name (PRD-002 §11)", () => {
    const r = new DirectiveRegistry();
    expect(() =>
      r.register({
        name: "include",
        category: "project",
        handler: (ctx) => ({
          type: "directive",
          name: "include",
          arg: ctx.arg,
          location: ctx.location,
        }),
      }),
    ).toThrow(MgrError);
  });

  it("suggests a close match for typos", () => {
    const r = createFoundationRegistry();
    expect(r.suggest("improt")).toBe("import");
    expect(r.suggest("sekshun")).toBeUndefined();
  });

  it("reserved list matches PRD-002 §11", () => {
    for (const name of [
      "include",
      "define",
      "const",
      "if",
      "elseif",
      "else",
      "endif",
      "warning",
      "deprecated",
      "plugin",
      "feature",
      "using",
      "override",
      "replace",
      "remove",
      "insert-before",
      "insert-after",
      "toc",
      "export",
    ]) {
      expect(RESERVED_DIRECTIVES.has(name)).toBe(true);
    }
  });

  it("reserves directive names claimed by PRD-005/006/009/010", () => {
    // Reserving these now prevents user files from squatting on
    // syntax that lands in future Foundation releases.
    for (const name of [
      // PRD-006 §11a Visibility
      "visibility",
      "public",
      "private",
      "hidden",
      // PRD-006 §5a Transient Entity
      "transient",
      "entity",
      "variable",
      "collection",
      "property",
      // PRD-005 §7/§7a Pre/Post Event
      "pre-event",
      "post-event",
      // PRD-009 Formula System
      "formula",
      // PRD-010 Rule Language
      "rule",
      "precondition",
      "effect",
      "trigger",
      "guard",
      "priority",
    ]) {
      expect(RESERVED_DIRECTIVES.has(name)).toBe(true);
    }
  });

  it("reserves directive names claimed by PRD-008 §15a and PRD-011/012/013", () => {
    for (const name of [
      // PRD-008 §15a shared block names
      "kind",
      "attributes",
      "behaviour",
      "relationships",
      "phase",
      "lifetime",
      "type",
      "default",
      "domain",
      // PRD-012 Action Resolution
      "action",
      "intent",
      "parameters",
      "auto-action",
      "reserved-intent",
      "passthrough",
      // PRD-013 Query & Selector
      "query",
      "where",
      "select",
      "order-by",
      "limit",
      "first",
      "last",
      "any",
      "all",
      "none",
      // PRD-011 Rule Execution Model
      "atomic",
      "rollback",
      "conflict-policy",
      "snapshot",
    ]) {
      expect(RESERVED_DIRECTIVES.has(name)).toBe(true);
    }
  });
});

describe("parser rejects reserved directives (PRD-002 §11)", () => {
  it("emits DIRECTIVE_RESERVED, not UNKNOWN_DIRECTIVE, for @include", () => {
    try {
      parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: "@include other.md\n",
      });
      throw new Error("expected parseSource to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrError);
      expect((err as MgrError).code).toBe("DIRECTIVE_RESERVED");
      expect((err as MgrError).directive).toBe("@include");
    }
  });

  it("still emits UNKNOWN_DIRECTIVE for unregistered non-reserved names", () => {
    try {
      parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: "@foobar arg\n",
      });
      throw new Error("expected parseSource to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrError);
      expect((err as MgrError).code).toBe("UNKNOWN_DIRECTIVE");
    }
  });

  it("emits DIRECTIVE_RESERVED for names claimed by PRD-009/010", () => {
    for (const name of ["formula", "rule", "visibility", "transient"]) {
      try {
        parseSource({
          file: "/x/main.md",
          relPath: "main.md",
          source: `@${name} foo\n`,
        });
        throw new Error(`expected parseSource to throw on @${name}`);
      } catch (err) {
        expect(err).toBeInstanceOf(MgrError);
        expect((err as MgrError).code).toBe("DIRECTIVE_RESERVED");
      }
    }
  });
});

describe("import rules (PRD-002 §8)", () => {
  let root: string;

  it("ignores a duplicate import within the same file", async () => {
    // Same target imported twice from the same file — Builder should
    // silently dedupe, not fail.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "dup", entry: "main.md" }),
      "src/main.md": [
        "@import a.md",
        "",
        "@import a.md",
        "",
        "# Root",
      ].join("\n"),
      "src/a.md": "@section a\n\nA body\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    // Only one copy of the section survives. Custom section ids are
    // rendered as an uppercase level-1 heading by PSF (PRD-003 §15).
    const occurrences = result.output.match(/^# A$/gm)?.length ?? 0;
    expect(occurrences).toBe(1);
    await rm(root, { recursive: true, force: true });
  });

  it("supports the extensionless path form (PRD-002 §7)", async () => {
    // `@import intro` should resolve to `src/intro.md`.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "ext", entry: "main.md" }),
      "src/main.md": "@import intro\n",
      "src/intro.md": "@section intro\n\nBody\n",
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.output).toContain("# INTRO");
    await rm(root, { recursive: true, force: true });
  });
});
