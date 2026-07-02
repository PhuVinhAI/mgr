import { describe, it, expect } from "vitest";
import { optimize } from "../src/optimizer/index.js";

describe("optimizer", () => {
  it("collapses multiple blank lines to two", () => {
    const r = optimize("A\n\n\n\nB");
    expect(r.content).toBe("A\n\nB\n");
  });
  it("strips trailing whitespace and ensures single trailing newline", () => {
    const r = optimize("hello   \n");
    expect(r.content).toBe("hello\n");
  });
  it("normalizes CRLF to LF", () => {
    const r = optimize("a\r\nb\r\n");
    expect(r.content).toBe("a\nb\n");
  });

  it("strips single-line HTML comments (PSF §16 Prompt Purity)", () => {
    const r = optimize("A\n<!-- author note -->\nB\n");
    expect(r.content).toBe("A\nB\n");
  });

  it("strips inline HTML comments and keeps surrounding text", () => {
    const r = optimize("A <!-- cite -->tail\n");
    expect(r.content).toBe("A tail\n");
  });

  it("strips multi-line HTML comments", () => {
    const r = optimize(
      ["A", "<!-- line one", "line two", "line three -->", "B"].join("\n"),
    );
    expect(r.content).toBe("A\nB\n");
  });

  it("preserves HTML comments inside fenced code blocks", () => {
    const src = [
      "A",
      "```markdown",
      "<!-- example comment shown to reader -->",
      "```",
      "B",
    ].join("\n");
    expect(optimize(src).content).toBe(
      [
        "A",
        "```markdown",
        "<!-- example comment shown to reader -->",
        "```",
        "B",
        "",
      ].join("\n"),
    );
  });

  it("handles two comments on one line and lines with only a comment", () => {
    // Trailing whitespace after strip is scrubbed by the per-line
    // whitespace step. The solo-comment line collapses and is dropped.
    const src = ["<!-- a --> x <!-- b -->", "<!-- solo -->", "y"].join("\n");
    expect(optimize(src).content).toBe(" x\ny\n");
  });
});
