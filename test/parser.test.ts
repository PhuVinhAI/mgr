import { describe, it, expect } from "vitest";
import { parseSource } from "../src/parser/index.js";
import { MgrError } from "../src/errors/index.js";

describe("parser", () => {
  it("parses plain markdown as a single block", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: "# Hello\n\nworld",
    });
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]!.type).toBe("markdown");
    expect(doc.imports).toHaveLength(0);
    expect(doc.sections).toHaveLength(0);
  });

  it("recognizes @import and @section directives", () => {
    const doc = parseSource({
      file: "/x/main.md",
      relPath: "main.md",
      source: [
        "@import intro.md",
        "",
        "@section rules",
        "",
        "Body content.",
      ].join("\n"),
    });
    expect(doc.imports).toHaveLength(1);
    expect(doc.imports[0]!.arg).toBe("intro.md");
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0]!.id).toBe("rules");
    expect(doc.sections[0]!.body).toHaveLength(1);
  });

  it("rejects unknown directives with a suggestion", () => {
    expect(() =>
      parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: "@improt intro.md",
      }),
    ).toThrow(MgrError);
  });

  it("rejects @section without an id", () => {
    expect(() =>
      parseSource({
        file: "/x/main.md",
        relPath: "main.md",
        source: "@section",
      }),
    ).toThrow(MgrError);
  });
});
