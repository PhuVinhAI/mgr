/**
 * i18n message catalog for MGR CLI + compiler.
 * Keys are stable. Values may contain `{name}` placeholders.
 */
export type Locale = "en" | "vi";

export interface StepLabels {
  "load-project": string;
  parse: string;
  validate: string;
  bundle: string;
  optimize: string;
  write: string;
}

/**
 * Error catalog keyed by MgrErrorCode.
 * Each error may have a message template and a default suggestion template.
 * Both may reference `{name}` placeholders bound at throw time.
 */
export interface ErrorCatalog {
  PROJECT_NOT_FOUND: { message: string; suggestion: string };
  CONFIG_INVALID: { message: string; suggestion: string };
  FILE_NOT_FOUND: { message: string; suggestion: string };
  READ_FAILED: { message: string; suggestion: string };
  UNKNOWN_DIRECTIVE: { message: string; suggestion: string };
  DIRECTIVE_RESERVED: { message: string; suggestion: string };
  DIRECTIVE_SYNTAX_SECTION_MISSING_ID: { message: string; suggestion: string };
  DIRECTIVE_SYNTAX_SECTION_INVALID_ID: { message: string; suggestion: string };
  DIRECTIVE_SYNTAX_IMPORT_MISSING_PATH: {
    message: string;
    suggestion: string;
  };
  IMPORT_NOT_FOUND: { message: string; suggestion: string };
  IMPORT_NOT_A_FILE: { message: string; suggestion: string };
  IMPORT_OUTSIDE_SRC: { message: string; suggestion: string };
  DUPLICATE_SECTION: { message: string; suggestion: string };
  DEPENDENCY_CYCLE: { message: string; suggestion: string };
  EMPTY_PROJECT: { message: string; suggestion: string };
  WRITE_FAILED: { message: string; suggestion: string };
  INTERNAL: { message: string; suggestion: string };
}

export type ErrorMessageKey = keyof ErrorCatalog;

export interface Messages {
  cli: {
    tagline: string;
    usage: string;
    commands: string;
    cmdInit: string;
    cmdBuild: string;
    cmdValidate: string;
    cmdDoctor: string;
    options: string;
    optLang: string;
    optHelp: string;
    optVersion: string;
    unknownCommand: string;
    meowHelp: string;
  };
  steps: StepLabels;
  stepDetail: {
    loadProject: string;
    parseEntry: string;
    parsedFiles: string;
    validateOk: string;
    validateFail: string;
    bundleMerged: string;
    writeTo: string;
  };
  init: {
    creating: string;
    exists: string;
    created: string;
    skipped: string;
    done: string;
    nextSteps: string;
    nextBuild: string;
    nextValidate: string;
  };
  build: {
    starting: string;
    success: string;
    failed: string;
    output: string;
    duration: string;
    files: string;
  };
  validate: {
    starting: string;
    ok: string;
    failed: string;
    errorsFound: string;
  };
  doctor: {
    starting: string;
    node: string;
    platform: string;
    cwd: string;
    projectFound: string;
    projectMissing: string;
    ok: string;
    issues: string;
  };
  errors: {
    header: string;
    file: string;
    line: string;
    directive: string;
    suggestion: string;
    unexpected: string;
    didYouMean: string;
    byCode: ErrorCatalog;
  };
  common: {
    yes: string;
    no: string;
    cancel: string;
  };
}
