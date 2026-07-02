import type { Messages } from "./types.js";

export const en: Messages = {
  cli: {
    tagline: "Markdown Game Runtime — a compiler for Prompt Programming",
    usage: "Usage",
    commands: "Commands",
    cmdInit: "Create a new MGR project in the current directory",
    cmdBuild: "Compile the project into a single Prompt Specification",
    cmdValidate: "Validate the project without producing an output",
    cmdDoctor: "Report environment and project health",
    options: "Options",
    optLang: "Language: en | vi (default: auto)",
    optHelp: "Show this help",
    optVersion: "Show version",
    unknownCommand: "Unknown command: {name}",
    meowHelp: `
    Usage: mgr <command> [options]

    Commands:
      init       Create a new MGR project
      build      Compile into a single Prompt Specification
      validate   Validate without producing output
      doctor     Report environment and project health

    Options:
      --lang <en|vi>   Language (default: auto)
      --help, -h       Show help
      --version, -v    Show version
  `,
  },
  steps: {
    "load-project": "Load project",
    parse: "Parse sources",
    validate: "Validate",
    bundle: "Bundle",
    optimize: "Optimize",
    write: "Write output",
  },
  stepDetail: {
    loadProject: "Loading mgr.config.json",
    parseEntry: "Parsing entry {entry}",
    parsedFiles: "{count} file(s) parsed",
    validateOk: "no issues",
    validateFail: "{count} error(s)",
    bundleMerged: "{count} file(s) merged",
    writeTo: "{path}",
  },
  init: {
    creating: "Creating project files in {dir}",
    exists: "File already exists, skipping: {path}",
    created: "created",
    skipped: "skipped",
    done: "Project initialized.",
    nextSteps: "Next steps:",
    nextBuild: "  mgr build     # compile into dist/game.md",
    nextValidate: "  mgr validate  # check project without writing output",
  },
  build: {
    starting: "Compiling project",
    success: "Build succeeded.",
    failed: "Build failed.",
    output: "Output: {path}",
    duration: "Duration: {ms} ms",
    files: "Files: {count}",
  },
  validate: {
    starting: "Validating project",
    ok: "Project is valid.",
    failed: "Project is invalid.",
    errorsFound: "{count} error(s) found",
  },
  doctor: {
    starting: "Running diagnostics",
    node: "Node.js: {version}",
    platform: "Platform: {name}",
    cwd: "Working dir: {path}",
    projectFound: "Project detected: mgr.config.json ✓",
    projectMissing: "No mgr.config.json in the current directory",
    ok: "Everything looks good.",
    issues: "{count} issue(s) detected",
  },
  errors: {
    header: "Error",
    file: "File",
    line: "Line",
    directive: "Directive",
    suggestion: "Suggestion",
    unexpected: "Unexpected error",
    didYouMean: "Did you mean @{name} ?",
    byCode: {
      PROJECT_NOT_FOUND: {
        message: "Cannot read mgr.config.json at {path}",
        suggestion: "Run `mgr init` to create a new project here.",
      },
      CONFIG_INVALID: {
        message: "Invalid mgr.config.json",
        suggestion: "Fix the fields flagged in the error message.",
      },
      FILE_NOT_FOUND: {
        message: "{label} not found: {path}",
        suggestion: "Create the file, or set `entry` in mgr.config.json.",
      },
      READ_FAILED: {
        message: "Cannot read source file",
        suggestion: "Check the path and file permissions.",
      },
      UNKNOWN_DIRECTIVE: {
        message: "Unknown directive @{name}",
        suggestion: "Did you mean @{hint} ?",
      },
      DIRECTIVE_SYNTAX_SECTION_MISSING_ID: {
        message: "@section directive requires an id",
        suggestion: "Write `@section <id>` (e.g. `@section intro`).",
      },
      DIRECTIVE_SYNTAX_SECTION_INVALID_ID: {
        message: "Invalid section id: \"{id}\"",
        suggestion: "Use letters, digits, dashes, underscores, or dots only.",
      },
      DIRECTIVE_SYNTAX_IMPORT_MISSING_PATH: {
        message: "@import directive requires a path",
        suggestion: "Write `@import <path>` (e.g. `@import intro.md`).",
      },
      IMPORT_NOT_FOUND: {
        message: "@import target not found: {path}",
        suggestion:
          "Check the path. Imports are resolved relative to the current file, or to srcDir when starting with `/`.",
      },
      IMPORT_NOT_A_FILE: {
        message: "@import target is not a regular file: {path}",
        suggestion: "Point @import at a Markdown file (.md).",
      },
      IMPORT_OUTSIDE_SRC: {
        message: "@import escapes srcDir: {path}",
        suggestion:
          "All imports must resolve inside srcDir. Use paths relative to the current file, or `/` prefix for srcDir-root paths.",
      },
      DUPLICATE_SECTION: {
        message: "Duplicate section id \"{id}\"",
        suggestion: "Rename this section. First declared in {origin}.",
      },
      DEPENDENCY_CYCLE: {
        message: "Dependency cycle detected: {chain}",
        suggestion:
          "Break the cycle by removing one of the @import edges above.",
      },
      EMPTY_PROJECT: {
        message: "Project has no content to bundle",
        suggestion: "Add Markdown content or a `@section` to the entry file.",
      },
      WRITE_FAILED: {
        message: "Cannot write output file",
        suggestion: "Check the outDir path and file permissions.",
      },
      INTERNAL: {
        message: "Internal compiler error",
        suggestion: "Please report this along with the source that triggered it.",
      },
    },
  },
  common: {
    yes: "yes",
    no: "no",
    cancel: "cancel",
  },
};
