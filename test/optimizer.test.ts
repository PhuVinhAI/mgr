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
});
