/**
 * Compile pipeline (PRD §11):
 *   Load Project → Load Files → Parse → Graph → Validate → Bundle → Optimize → Write
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { MgrError, MgrErrorList } from "./errors/index.js";
import { Logger, nullSink, type LoggerSink } from "./logger/index.js";
import {
  DEFAULT_CONFIG,
  parseConfig,
  isRuntimeCompatible,
  resolveOutFilename,
  type MgrConfig,
} from "./config/index.js";
import { buildGraph, type ProjectGraph } from "./graph/index.js";
import { validate, type ValidateResult } from "./validator/index.js";
import { bundle, type BundleResult } from "./bundler/index.js";
import { optimize } from "./optimizer/index.js";
import { t } from "./i18n/index.js";
import { COMPILER_VERSION } from "./version.js";
import { RUNTIME_SPEC_VERSION } from "./runtime/index.js";
import { countTokens, type TokenCount } from "./tokenizer/index.js";

export interface CompileOptions {
  /** Project root directory (must contain mgr.config.json). */
  root: string;
  /** Optional custom sink for progress events. */
  sink?: LoggerSink;
  /** If false, skip writing to disk. Default: true. */
  write?: boolean;
  /**
   * Pin the Build Date recorded in PSF Metadata (§14). If omitted a
   * fresh `new Date()` is used. Tests asserting Prompt Stability
   * (§17) should pin this to keep output byte-identical.
   */
  buildDate?: Date;
  /**
   * If false, skip token counting entirely. Default: true. Token
   * counting is local for OpenAI + Anthropic; for Gemini it uses
   * the API when `GEMINI_API_KEY` is set and falls back to the
   * ~4 chars/token estimator otherwise.
   */
  tokens?: boolean;
}

export interface CompileResult {
  config: MgrConfig;
  graph: ProjectGraph;
  validation: ValidateResult;
  bundle: BundleResult;
  output: string;
  outputPath: string;
  durationMs: number;
  /**
   * Token counts for the compiled Markdown across OpenAI, Anthropic,
   * and Gemini providers. Undefined when `options.tokens === false`.
   * Computed after the Optimizer step on the final content so the
   * numbers reflect what the LLM will actually see.
   */
  tokens?: TokenCount;
}

const CONFIG_FILE = "mgr.config.json";

export async function loadConfig(root: string): Promise<MgrConfig> {
  const configPath = path.join(root, CONFIG_FILE);
  let raw: unknown;
  try {
    const text = await readFile(configPath, "utf8");
    raw = JSON.parse(text);
  } catch (cause) {
    throw new MgrError({
      code: "PROJECT_NOT_FOUND",
      messageKey: "PROJECT_NOT_FOUND",
      params: { path: configPath },
      location: { file: configPath },
      cause,
    });
  }
  try {
    return parseConfig(raw);
  } catch (cause) {
    throw new MgrError({
      code: "CONFIG_INVALID",
      messageKey: "CONFIG_INVALID",
      location: { file: configPath },
      cause,
    });
  }
}

export async function compile(
  options: CompileOptions,
): Promise<CompileResult> {
  const started = performance.now();
  const logger = new Logger(options.sink ?? nullSink);
  const root = path.resolve(options.root);

  // 1. Load Project.
  logger.stepStart("load-project", t((m) => m.stepDetail.loadProject));
  const config = await loadConfig(root);
  logger.stepSuccess("load-project", `${config.name}@${config.version}`);

  // 1b. PRD-008 §16 — enforce Game Package / Runtime compatibility.
  if (config.runtime && !isRuntimeCompatible(RUNTIME_SPEC_VERSION, config.runtime)) {
    const actualMajor = RUNTIME_SPEC_VERSION.split(".")[0] ?? "1";
    throw new MgrError({
      code: "RUNTIME_INCOMPATIBLE",
      messageKey: "RUNTIME_INCOMPATIBLE",
      params: {
        target: config.runtime,
        actual: RUNTIME_SPEC_VERSION,
        actualMajor,
      },
      location: { file: path.join(root, CONFIG_FILE) },
    });
  }

  const srcDir = path.join(root, config.srcDir);

  // 2. Load + Parse (folded into graph build).
  logger.stepStart(
    "parse",
    t((m) => m.stepDetail.parseEntry, { entry: config.entry }),
  );
  let graph: ProjectGraph;
  try {
    graph = await buildGraph({ srcDir, entry: config.entry });
  } catch (err) {
    logger.stepFail("parse");
    throw err;
  }
  logger.stepSuccess(
    "parse",
    t((m) => m.stepDetail.parsedFiles, { count: graph.documents.size }),
  );

  // 3. Validate.
  logger.stepStart("validate");
  const validation = validate(graph);
  if (!validation.ok) {
    logger.stepFail(
      "validate",
      t((m) => m.stepDetail.validateFail, { count: validation.errors.length }),
    );
    throw new MgrErrorList(validation.errors);
  }
  logger.stepSuccess("validate", t((m) => m.stepDetail.validateOk));

  // 4. Bundle.
  logger.stepStart("bundle");
  const buildDate = (options.buildDate ?? new Date()).toISOString();
  const bundled = bundle({
    graph,
    metadata: {
      project: config.name,
      version: config.version,
      buildDate,
      compilerVersion: COMPILER_VERSION,
      ...(config.author ? { author: config.author } : {}),
      ...(config.description ? { description: config.description } : {}),
      ...(config.runtime ? { runtimeTarget: config.runtime } : {}),
    },
  });
  logger.stepSuccess(
    "bundle",
    t((m) => m.stepDetail.bundleMerged, { count: bundled.order.length }),
  );

  // 5. Optimize.
  logger.stepStart("optimize");
  const optimized = optimize(bundled.content);
  logger.stepSuccess("optimize");

  // 5b. Token counting. Skipped when `options.tokens === false` so
  //     callers in CI pipelines can opt out. The OpenAI and
  //     Anthropic tokenizers run synchronously; the Gemini call is
  //     awaited and falls back to an estimator when no API key is
  //     configured.
  let tokens: TokenCount | undefined;
  if (options.tokens !== false) {
    logger.stepStart(
      "tokens",
      t((m) => m.stepDetail.tokens, {
        chars: String(optimized.content.length),
      }),
    );
    try {
      tokens = await countTokens(optimized.content);
      logger.stepSuccess(
        "tokens",
        t((m) => m.stepDetail.tokensSummary, {
          openai: String(tokens.openai.tokens),
          anthropic: String(tokens.anthropic.tokens),
          gemini: String(tokens.gemini.tokens),
        }),
      );
    } catch (err) {
      logger.stepFail("tokens", (err as Error).message ?? String(err));
    }
  }

  // 6. Write.
  const outputPath = path.join(root, config.outDir, resolveOutFilename(config));
  if (options.write !== false) {
    logger.stepStart("write", path.relative(root, outputPath));
    try {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, optimized.content, "utf8");
    } catch (cause) {
      logger.stepFail("write");
      throw new MgrError({
        code: "WRITE_FAILED",
        messageKey: "WRITE_FAILED",
        location: { file: outputPath },
        cause,
      });
    }
    logger.stepSuccess("write");
  }

  return {
    config,
    graph,
    validation,
    bundle: bundled,
    output: optimized.content,
    outputPath,
    durationMs: performance.now() - started,
    ...(tokens ? { tokens } : {}),
  };
}

/** Validate-only: same as compile up to the validate step. */
export async function check(
  options: CompileOptions,
): Promise<{ config: MgrConfig; graph: ProjectGraph; validation: ValidateResult }> {
  const logger = new Logger(options.sink ?? nullSink);
  const root = path.resolve(options.root);
  logger.stepStart("load-project");
  const config = await loadConfig(root);
  logger.stepSuccess("load-project");
  const srcDir = path.join(root, config.srcDir);
  logger.stepStart("parse");
  const graph = await buildGraph({ srcDir, entry: config.entry });
  logger.stepSuccess(
    "parse",
    t((m) => m.stepDetail.parsedFiles, { count: graph.documents.size }),
  );
  logger.stepStart("validate");
  const validation = validate(graph);
  if (validation.ok) logger.stepSuccess("validate");
  else
    logger.stepFail(
      "validate",
      t((m) => m.stepDetail.validateFail, { count: validation.errors.length }),
    );
  return { config, graph, validation };
}
