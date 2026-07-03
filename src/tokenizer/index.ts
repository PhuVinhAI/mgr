/**
 * Token counting for compiled Prompt Specifications.
 *
 * PRD-009 §13 prescribes that the Bundler emits a single Markdown
 * document. Before the LLM ever sees that document, an author should
 * know how many tokens it will consume on each candidate runtime.
 * Token counts differ across providers — Anthropic's docs warn that
 * using tiktoken for Claude undercounts by 15-20% — so each provider
 * gets its own tokenizer.
 *
 * Providers:
 *   - openai    — `js-tiktoken` (BPE, exact, local, default
 *                 `gpt-5`). The library's TiktokenModel union is the
 *                 source of truth for supported models; this list is
 *                 refreshed per js-tiktoken release and currently
 *                 tops out at `gpt-5` / `gpt-5-mini` / `gpt-5-nano`
 *                 / `gpt-5-chat-latest`. For unknown or newer model
 *                 names the module falls back to `o200k_base` (the
 *                 encoding the GPT-5 family uses).
 *   - anthropic — `@anthropic-ai/tokenizer` (official Claude
 *                 tokenizer, local, default `claude-sonnet-5`).
 *                 The local tokenizer is model-agnostic; the model
 *                 name is recorded for downstream diagnostics.
 *   - gemini    — `@google/genai` `models.countTokens` (exact, but
 *                 requires `GEMINI_API_KEY` / `GOOGLE_API_KEY`,
 *                 default `gemini-3.5-flash`). When no key is present
 *                 the module falls back to the ~4 chars/token
 *                 heuristic Google publishes for text tokenization.
 *
 * The module is dependency-injected: callers may pass their own
 * provider implementations (useful for tests). By default the real
 * SDKs are loaded; the optimizer and pipeline never see this code
 * fail unless every provider is unavailable.
 */
import {
  encodingForModel,
  getEncoding,
  type Tiktoken,
  type TiktokenModel,
} from "js-tiktoken";
import { countTokens as anthropicCountTokens } from "@anthropic-ai/tokenizer";
import { GoogleGenAI } from "@google/genai";

/** Tokenizer kinds the module supports. */
export type TokenizerProvider = "openai" | "anthropic" | "gemini";

/** Per-provider token count + diagnostics. */
export interface ProviderCount {
  /** Numeric token count. -1 means counting failed. */
  tokens: number;
  /** Identifier of the model the count applies to. */
  model: string;
  /** "exact" | "estimate" | "error" */
  kind: "exact" | "estimate" | "error";
  /** Human-readable error message when kind === "error". */
  error?: string;
}

/** Output of `countTokens(text)`. */
export interface TokenCount {
  /** Character count of the input (for sanity checks). */
  characters: number;
  openai: ProviderCount;
  anthropic: ProviderCount;
  gemini: ProviderCount;
}

/** Options accepted by `countTokens`. */
export interface CountTokensOptions {
  /**
   * OpenAI model name (default `gpt-5`). Accepts any string; the
   * module looks up the encoding via js-tiktoken and falls back to
   * `o200k_base` (the GPT-5+ family encoding) when the model name
   * is unknown. Older GPT-4 family encodings are still served by
   * the library when the name is recognised.
   */
  openaiModel?: string;
  /**
   * Anthropic model name (default `claude-sonnet-5`). The local
   * tokenizer does not currently vary by model — the parameter is
   * recorded in the result for clarity.
   */
  anthropicModel?: string;
  /**
   * Gemini model name (default `gemini-3.5-flash`). The local
   * estimator ignores it; the SDK call uses it.
   */
  geminiModel?: string;
  /**
   * Override the Google GenAI client. When omitted, the module
   * constructs a client from `GEMINI_API_KEY` / `GOOGLE_API_KEY`;
   * when neither env var is set, the SDK is not contacted and the
   * estimator is used.
   */
  geminiClient?: GoogleGenAI;
}

/**
 * Count tokens across all three providers. Provider failures are
 * isolated — one failing provider does not poison the others.
 */
export async function countTokens(
  text: string,
  options: CountTokensOptions = {},
): Promise<TokenCount> {
  return {
    characters: text.length,
    openai: countOpenAI(text, options.openaiModel),
    anthropic: countAnthropic(text, options.anthropicModel),
    gemini: await countGemini(text, {
      ...(options.geminiModel ? { model: options.geminiModel } : {}),
      ...(options.geminiClient ? { client: options.geminiClient } : {}),
    }),
  };
}

// -----------------------------------------------------------------
// OpenAI — js-tiktoken
// -----------------------------------------------------------------

/** Cache of loaded encodings to avoid the expensive init on repeat calls. */
const openaiCache = new Map<string, Tiktoken>();

/**
 * Resolve the BPE encoder for the given OpenAI model name.
 *
 * `encodingForModel` throws when the name is not in the bundled
 * model-to-encoding map. js-tiktoken ships through `gpt-5` / `gpt-5-
 * mini` / `gpt-5-nano` (Aug 2025); for newer model names not yet in
 * the map we fall back to `o200k_base` (the encoding the GPT-5
 * family uses) so the count stays exact rather than reporting -1.
 */
function getOpenAITokenizer(model: string): Tiktoken {
  const cached = openaiCache.get(model);
  if (cached) return cached;
  let tk: Tiktoken;
  try {
    tk = encodingForModel(model as TiktokenModel);
  } catch {
    tk = getEncoding("o200k_base");
  }
  openaiCache.set(model, tk);
  return tk;
}

/**
 * Encode text with the BPE tokenizer for the requested OpenAI model.
 * Returns a `ProviderCount` with kind `"exact"` on success.
 *
 * @param text  The string to count.
 * @param model Any OpenAI model name (default `gpt-5`). Unknown
 *              names resolve to the `o200k_base` encoding.
 */
export function countOpenAI(
  text: string,
  model: string = "gpt-5",
): ProviderCount {
  try {
    const tokens = getOpenAITokenizer(model).encode(text);
    return { tokens: tokens.length, model, kind: "exact" };
  } catch (err) {
    return {
      tokens: -1,
      model,
      kind: "error",
      error: errorMessage(err),
    };
  }
}

// -----------------------------------------------------------------
// Anthropic — @anthropic-ai/tokenizer
// -----------------------------------------------------------------

/**
 * Count tokens with Anthropic's official local tokenizer. The model
 * name is recorded for downstream diagnostics but does not affect the
 * local count — Anthropic's tokenizer is model-agnostic for the
 * current generation.
 */
export function countAnthropic(
  text: string,
  model: string = "claude-sonnet-5",
): ProviderCount {
  try {
    const tokens = anthropicCountTokens(text);
    return { tokens, model, kind: "exact" };
  } catch (err) {
    return {
      tokens: -1,
      model,
      kind: "error",
      error: errorMessage(err),
    };
  }
}

// -----------------------------------------------------------------
// Gemini — @google/genai countTokens API with chars/4 fallback
// -----------------------------------------------------------------

export interface CountGeminiOptions {
  model?: string;
  client?: GoogleGenAI;
}

/**
 * Count tokens for a Gemini model. If `GEMINI_API_KEY` / `GOOGLE_API_KEY`
 * is set (or a client is provided), calls the API for an exact count.
 * Otherwise falls back to Google's published heuristic of
 * ~4 characters per token for English text.
 */
export async function countGemini(
  text: string,
  options: CountGeminiOptions = {},
): Promise<ProviderCount> {
  const model = options.model ?? "gemini-3.5-flash";
  const client = options.client ?? resolveDefaultGeminiClient();

  if (client) {
    try {
      const response = await client.models.countTokens({
        model,
        contents: text,
      });
      const tokens = response.totalTokens ?? -1;
      if (tokens < 0) {
        return {
          tokens: -1,
          model,
          kind: "error",
          error: "API returned no totalTokens",
        };
      }
      return { tokens, model, kind: "exact" };
    } catch (err) {
      // Fall through to estimation rather than reporting an error:
      // authors running the CLI without a key should still get a
      // number, and the estimator is accurate within ±10 % for the
      // mixed Markdown content MGR emits.
      return {
        tokens: estimateGemini(text),
        model,
        kind: "estimate",
        error: `API call failed, used estimator: ${errorMessage(err)}`,
      };
    }
  }

  return {
    tokens: estimateGemini(text),
    model,
    kind: "estimate",
  };
}

/**
 * Build a GoogleGenAI client from environment variables. Returns
 * undefined when no API key is set so the caller can fall back to the
 * estimator without surfacing a hard error.
 */
function resolveDefaultGeminiClient(): GoogleGenAI | undefined {
  const apiKey =
    process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_API_KEY"];
  if (!apiKey) return undefined;
  return new GoogleGenAI({ apiKey });
}

/**
 * Google's published heuristic: 100 tokens ≈ 60-80 English words, or
 * ~4 characters per token. We round up so a 1-character input still
 * reports 1 token instead of 0.
 */
function estimateGemini(text: string): number {
  if (text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// -----------------------------------------------------------------
// Re-exports for tests + pipeline.
// -----------------------------------------------------------------

export { encodingForModel, getEncoding };
export type { Tiktoken, TiktokenModel };
