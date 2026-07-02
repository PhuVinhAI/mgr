import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { compile } from "../src/pipeline.js";
import { MgrErrorList } from "../src/errors/index.js";

async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "mgr-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  return root;
}

describe("section schema validator (PRD-008 §15a)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("accepts a well-formed Rule Transformation", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "ok", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule ApplyBuyLemons",
        "Kind: Transformation",
        "Trigger:",
        "On Action(Buy Lemons)",
        "Precondition:",
        "Money >= Quantity * 5",
        "Effect:",
        "Money -= Quantity * 5",
        "Purpose:",
        "Apply the Buy Lemons transaction atomically.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });

  it("rejects a Transformation missing Effect (PRD-008 §15a.4)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-effect", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule ApplyBuyLemons",
        "Kind: Transformation",
        "Trigger:",
        "On Action(Buy Lemons)",
        "Precondition:",
        "Money >= 5",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(errs.some((e) => e.code === "SECTION_SCHEMA_MISSING_BLOCK")).toBe(
        true,
      );
    }
  });

  it("rejects a Guard that carries Effect (§15a.4)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "guard-eff", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule CanBuy",
        "Kind: Guard",
        "Trigger:",
        "On Action(Buy)",
        "Precondition:",
        "Money >= 5",
        "Effect:",
        "Money -= 5",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(
        errs.some((e) => e.code === "SECTION_SCHEMA_FORBIDDEN_BLOCK"),
      ).toBe(true);
    }
  });

  it("rejects a Rule with no Kind block (§15a.4)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-kind", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule ApplyBuyLemons",
        "Trigger:",
        "On Action(Buy Lemons)",
        "Precondition:",
        "Money >= 5",
        "Effect:",
        "Money -= 5",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(errs.some((e) => e.code === "SECTION_SCHEMA_MISSING_KIND")).toBe(
        true,
      );
    }
  });

  it("rejects an Entity missing Attributes (§15a.2)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-attr", entry: "main.md" }),
      "src/main.md": [
        "@section entities",
        "",
        "Entity Player",
        "Kind: Persistent",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(errs.some((e) => e.code === "SECTION_SCHEMA_MISSING_BLOCK")).toBe(
        true,
      );
    }
  });

  it("rejects a Variable missing Visibility (§15a.1)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-vis", entry: "main.md" }),
      "src/main.md": ["@section state", "", "Variable Money"].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(errs.some((e) => e.code === "SECTION_SCHEMA_MISSING_BLOCK")).toBe(
        true,
      );
    }
  });

  it("rejects a duplicate block within one declaration (§15a.10)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "dup", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule Foo",
        "Kind: Transformation",
        "Trigger:",
        "On Action(X)",
        "Precondition:",
        "Money >= 5",
        "Effect:",
        "Money -= 5",
        "Effect:",
        "Reputation += 1",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(errs.some((e) => e.code === "SECTION_SCHEMA_DUPLICATE_BLOCK")).toBe(
        true,
      );
    }
  });

  it("tolerates value: type lines inside content blocks (e.g. Parameters)", async () => {
    // "Quantity: Integer" under "Parameters:" is content, not a new
    // block heading. Only names in the §15a.10 catalog participate in
    // schema enforcement.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "content", entry: "main.md" }),
      "src/main.md": [
        "@section actions",
        "",
        "Action Buy Lemons",
        "Intent:",
        "buy lemons",
        "Parameters:",
        "Quantity: Integer",
        "Price: Rational",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });

  it("accepts an Action with Intent, Parameters, Preconditions (§15a.6)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "act", entry: "main.md" }),
      "src/main.md": [
        "@section actions",
        "",
        "Action Buy Lemons",
        "Intent:",
        "buy lemons",
        "purchase lemons",
        "Parameters:",
        "Quantity: Integer",
        "Preconditions:",
        "Money >= Quantity * 5",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });

  it("accepts an Event with Phase, Trigger, Effect (§15a.5)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "evt", entry: "main.md" }),
      "src/main.md": [
        "@section events",
        "",
        "Event Weather Roll",
        "Phase: Pre",
        "Trigger:",
        "Start of Day.",
        "Effect:",
        "Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });

  it("accepts a Variable with Visibility (§15a.1)", async () => {
    // Variable Purpose is WARNING, not ERROR; build passes.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "vv", entry: "main.md" }),
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

  it("accepts a Formula with just a body (§15a.3)", async () => {
    // Formula Purpose is WARNING; body is an arithmetic expression.
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "ff", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Formula BaseDemand",
        "Reputation * 0.5 + 10",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
  });
});

describe("documentation schema validator (PRD-014)", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("requires Purpose on Rule at ERROR level", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "np", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule ApplyFoo",
        "Kind: Transformation",
        "Trigger:",
        "On Action(Foo)",
        "Precondition:",
        "true",
        "Effect:",
        "X += 1",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(
        errs.some((e) => e.code === "DOCUMENTATION_PURPOSE_MISSING"),
      ).toBe(true);
    }
  });

  it("requires Purpose on Action at ERROR level", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "np-act", entry: "main.md" }),
      "src/main.md": [
        "@section actions",
        "",
        "Action Foo",
        "Intent:",
        "foo",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(
        errs.some((e) => e.code === "DOCUMENTATION_PURPOSE_MISSING"),
      ).toBe(true);
    }
  });

  it("requires Purpose on Event at ERROR level", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "np-evt", entry: "main.md" }),
      "src/main.md": [
        "@section events",
        "",
        "Event Foo",
        "Phase: Pre",
        "Trigger:",
        "Start of Day.",
        "Effect:",
        "X := 1",
      ].join("\n"),
    });
    try {
      await compile({ root, buildDate: new Date(0) });
      throw new Error("expected compile to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MgrErrorList);
      const errs = (err as MgrErrorList).errors;
      expect(
        errs.some((e) => e.code === "DOCUMENTATION_PURPOSE_MISSING"),
      ).toBe(true);
    }
  });

  it("Purpose on Variable is only WARNING — build passes", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "var-no-p", entry: "main.md" }),
      "src/main.md": [
        "@section state",
        "",
        "Variable Money",
        "Visibility: Public",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(
      result.validation.warnings.some(
        (w) => w.code === "DOCUMENTATION_PURPOSE_MISSING",
      ),
    ).toBe(true);
  });

  it("Failure on Rule Transformation is WARNING — build passes", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "no-fail", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule ApplyFoo",
        "Kind: Transformation",
        "Trigger:",
        "On Action(Foo)",
        "Precondition:",
        "true",
        "Effect:",
        "X += 1",
        "Purpose:",
        "Increment X on Foo action.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(
      result.validation.warnings.some(
        (w) => w.code === "DOCUMENTATION_FAILURE_MISSING",
      ),
    ).toBe(true);
  });

  it("Failure on Action is WARNING — build passes", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "act-no-fail", entry: "main.md" }),
      "src/main.md": [
        "@section actions",
        "",
        "Action Foo",
        "Intent:",
        "foo",
        "Purpose:",
        "Placeholder purpose.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(
      result.validation.warnings.some(
        (w) => w.code === "DOCUMENTATION_FAILURE_MISSING",
      ),
    ).toBe(true);
  });

  it("Formula body that reads as prose emits a warning (PRD-009 §18a)", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "prose", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Formula CustomersToday",
        "Customers depend on weather and price then multiply",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(
      result.validation.warnings.some(
        (w) => w.code === "FORMULA_BODY_INVALID",
      ),
    ).toBe(true);
  });

  it("Formula body that is a valid expression does not warn", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "expr", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Formula Damage",
        "Attack - Defense",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(
      result.validation.warnings.some(
        (w) => w.code === "FORMULA_BODY_INVALID",
      ),
    ).toBe(false);
  });

  it("Formula body with Piecewise When/Then does not warn", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "piece", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Formula WeatherModifier",
        "When Weather = Rainy      Then 0.5",
        "When Weather = Heat Wave  Then 2.0",
        "Otherwise                 Then 1.0",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(
      result.validation.warnings.some(
        (w) => w.code === "FORMULA_BODY_INVALID",
      ),
    ).toBe(false);
  });

  it("full documentation block set passes without warnings", async () => {
    root = await makeProject({
      "mgr.config.json": JSON.stringify({ name: "full", entry: "main.md" }),
      "src/main.md": [
        "@section rules",
        "",
        "Rule ApplyFoo",
        "Kind: Transformation",
        "Trigger:",
        "On Action(Foo)",
        "Precondition:",
        "X < 10",
        "Effect:",
        "X += 1",
        "Purpose:",
        "Increment X when Foo action fires and X is under 10.",
        "Failure:",
        "Reject action; X does not change.",
      ].join("\n"),
    });
    const result = await compile({ root, buildDate: new Date(0) });
    expect(result.validation.ok).toBe(true);
    expect(result.validation.warnings.length).toBe(0);
  });
});
