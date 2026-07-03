import { describe, it, expect } from "vitest";
import {
  countOpenAI,
  countAnthropic,
  countGemini,
  countTokens,
} from "../src/tokenizer/index.js";

describe("countOpenAI (js-tiktoken)", () => {
  it("counts tokens for a known string on the default gpt-5", () => {
    const r = countOpenAI("hello world");
    // gpt-5 uses o200k_base (same as gpt-4o); "hello world" is a
    // small, stable tokenization across the o200k_base family.
    expect(r.kind).toBe("exact");
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.model).toBe("gpt-5");
  });

  it("returns a higher count for a longer string", () => {
    const short = countOpenAI("hi");
    const long = countOpenAI(
      "The quick brown fox jumps over the lazy dog. " +
        "Pack my box with five dozen liquor jugs. " +
        "How vexingly quick daft zebras jump!",
    );
    expect(long.tokens).toBeGreaterThan(short.tokens);
  });

  it("reports zero tokens for an empty string", () => {
    expect(countOpenAI("").tokens).toBe(0);
  });

  it("honors a custom model name when the library knows it", () => {
    const r = countOpenAI("hello", "gpt-4");
    expect(r.model).toBe("gpt-4");
    expect(r.kind).toBe("exact");
  });

  it("falls back to o200k_base for unknown model names", () => {
    // gpt-7 does not exist in js-tiktoken's model map; the module
    // should resolve to o200k_base (the GPT-5 family encoding) and
    // return an exact count rather than an error.
    const r = countOpenAI("hello world", "gpt-7");
    expect(r.kind).toBe("exact");
    expect(r.model).toBe("gpt-7");
    expect(r.tokens).toBeGreaterThan(0);
  });
});

describe("countAnthropic (@anthropic-ai/tokenizer)", () => {
  it("counts tokens with the default claude-sonnet-5 label", () => {
    const r = countAnthropic("hello world");
    expect(r.kind).toBe("exact");
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.model).toBe("claude-sonnet-5");
  });

  it("produces a count in the same order of magnitude as OpenAI", () => {
    const text =
      "The runtime reads the specification, reads the current state, " +
      "reads the player's action, validates the action, applies the rules, " +
      "updates the state, advances the narrative, renders the interface, " +
      "and waits for the next turn.";
    const oa = countOpenAI(text);
    const an = countAnthropic(text);
    // Anthropic and OpenAI tokenizers disagree by 10-25% on prose.
    // Use a generous tolerance to keep the assertion stable.
    const ratio = an.tokens / oa.tokens;
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(1.6);
  });

  it("returns zero tokens for an empty string", () => {
    expect(countAnthropic("").tokens).toBe(0);
  });

  it("honors a custom model label", () => {
    const r = countAnthropic("hello", "claude-opus-5");
    expect(r.model).toBe("claude-opus-5");
    expect(r.kind).toBe("exact");
  });
});

describe("countGemini (estimator + SDK fallback)", () => {
  it("returns an estimate when no API key is set", async () => {
    delete process.env["GEMINI_API_KEY"];
    delete process.env["GOOGLE_API_KEY"];
    const r = await countGemini("hello world");
    expect(r.kind).toBe("estimate");
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.model).toBe("gemini-3.5-flash");
  });

  it("estimate stays within ±20% of a 4 chars/token heuristic", async () => {
    const text = "a".repeat(400); // 400 chars => ~100 tokens
    const r = await countGemini(text);
    expect(r.tokens).toBeGreaterThanOrEqual(80);
    expect(r.tokens).toBeLessThanOrEqual(120);
  });

  it("returns 0 for an empty string", async () => {
    expect((await countGemini("")).tokens).toBe(0);
  });

  it("honors a custom model name in the result", async () => {
    const r = await countGemini("hello", { model: "gemini-3.5-pro" });
    expect(r.model).toBe("gemini-3.5-pro");
  });
});

describe("countTokens (aggregate)", () => {
  it("returns counts for all three providers using the defaults", async () => {
    const text =
      "The runtime reads the specification and applies the rules.";
    const result = await countTokens(text);
    expect(result.characters).toBe(text.length);
    expect(result.openai.kind).toBe("exact");
    expect(result.anthropic.kind).toBe("exact");
    expect(result.gemini.kind).toBe("estimate");
    expect(result.openai.tokens).toBeGreaterThan(0);
    expect(result.anthropic.tokens).toBeGreaterThan(0);
    expect(result.gemini.tokens).toBeGreaterThan(0);
    // Default models are the latest supported by each package.
    expect(result.openai.model).toBe("gpt-5");
    expect(result.anthropic.model).toBe("claude-sonnet-5");
    expect(result.gemini.model).toBe("gemini-3.5-flash");
  });

  it("records the chosen model on every provider", async () => {
    const result = await countTokens("hi", {
      openaiModel: "gpt-4o",
      anthropicModel: "claude-opus-5",
      geminiModel: "gemini-3.5-flash",
    });
    expect(result.openai.model).toBe("gpt-4o");
    expect(result.anthropic.model).toBe("claude-opus-5");
    expect(result.gemini.model).toBe("gemini-3.5-flash");
  });
});
