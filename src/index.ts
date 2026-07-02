/**
 * MGR public library entrypoint.
 */
export {
  MgrError,
  MgrErrorList,
  type MgrErrorCode,
  type MgrErrorLocation,
} from "./errors/index.js";

export {
  Logger,
  MemorySink,
  nullSink,
  type LogEvent,
  type LogLevel,
  type LoggerSink,
  type SinkEvent,
  type StepEvent,
} from "./logger/index.js";

export {
  parseConfig,
  DEFAULT_CONFIG,
  MgrConfigSchema,
  type MgrConfig,
} from "./config/index.js";

export {
  parseFile,
  parseSource,
  type ParseInput,
} from "./parser/index.js";

export {
  DirectiveRegistry,
  RESERVED_DIRECTIVES,
  createFoundationRegistry,
  type DirectiveCategory,
  type DirectiveContext,
  type DirectiveDefinition,
  type DirectiveHandler,
} from "./parser/directives.js";

export type {
  BlockNode,
  DirectiveName,
  DirectiveNode,
  MarkdownBlockNode,
  MgrDocument,
  SectionNode,
  SourceLocation,
} from "./parser/ast.js";

export {
  buildGraph,
  type BuildGraphInput,
  type ProjectGraph,
} from "./graph/index.js";

export {
  validate,
  assertValid,
  type ValidateResult,
} from "./validator/index.js";

export { bundle, type BundleResult } from "./bundler/index.js";

export { optimize, type OptimizeResult } from "./optimizer/index.js";

export {
  compile,
  check,
  loadConfig,
  type CompileOptions,
  type CompileResult,
} from "./pipeline.js";
