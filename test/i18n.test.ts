import { describe, it, expect, afterEach } from "vitest";
import { setLocale, getLocale } from "../src/i18n/index.js";
import { MgrError } from "../src/errors/index.js";

const original = getLocale();

afterEach(() => setLocale(original));

describe("i18n", () => {
  it("resolves error messages against the current locale", () => {
    const err = new MgrError({
      code: "IMPORT_NOT_FOUND",
      messageKey: "IMPORT_NOT_FOUND",
      params: { path: "missing.md" },
    });
    setLocale("en");
    expect(err.localizedMessage()).toContain("@import target not found");
    setLocale("vi");
    expect(err.localizedMessage()).toContain("Không tìm thấy đích của @import");
    expect(err.localizedSuggestion()).toContain("Kiểm tra đường dẫn");
  });

  it("substitutes placeholders", () => {
    const err = new MgrError({
      code: "UNKNOWN_DIRECTIVE",
      messageKey: "UNKNOWN_DIRECTIVE",
      params: { name: "improt", hint: "import" },
    });
    setLocale("vi");
    expect(err.localizedMessage()).toBe("Directive không xác định: @improt");
    expect(err.localizedSuggestion()).toBe("Có phải bạn muốn @import ?");
  });

  it("format() renders localized labels", () => {
    const err = new MgrError({
      code: "DUPLICATE_SECTION",
      messageKey: "DUPLICATE_SECTION",
      params: { id: "intro", origin: "a.md:3" },
      location: { file: "b.md", line: 5 },
      directive: "@section",
    });
    setLocale("vi");
    const out = err.format();
    expect(out).toMatch(/^Lỗi:/);
    expect(out).toContain("Dòng:");
    expect(out).toContain("Gợi ý:");
  });
});
