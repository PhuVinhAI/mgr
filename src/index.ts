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
  isRuntimeCompatible,
  resolveOutFilename,
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

export {
  bundle,
  type BundleInput,
  type BundleMetadata,
  type BundleResult,
} from "./bundler/index.js";

export {
  PSF_SECTIONS,
  PSF_SPEC_VERSION,
  psfSectionRank,
  psfSectionTitle,
  canonicalizeSectionId,
  type PsfSectionDef,
} from "./psf/index.js";

export {
  RUNTIME_SECTIONS,
  RUNTIME_SPEC_VERSION,
  isRuntimeSection,
  runtimeSectionBody,
  type RuntimeSectionDef,
} from "./runtime/index.js";

export {
  CONTRACT_SECTIONS,
  CONTRACT_SPEC_VERSION,
  isContractSection,
  contractSectionBody,
  type ContractSectionDef,
} from "./contracts/index.js";

export { COMPILER_VERSION } from "./version.js";

export { optimize, type OptimizeResult } from "./optimizer/index.js";

export {
  compile,
  check,
  loadConfig,
  type CompileOptions,
  type CompileResult,
} from "./pipeline.js";
