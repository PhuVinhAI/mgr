/**
 * MGR Error Model — per PRD §13.
 *
 * Errors are locale-agnostic at the throw site: each error carries a
 * `messageKey` referring to the i18n catalog plus `params` for template
 * substitution. The presentation layer resolves them against the current
 * locale — the compiler pipeline itself never bakes in English strings.
 */
import { getMessages, format } from "../i18n/index.js";
import type { ErrorMessageKey } from "../i18n/types.js";

export type MgrErrorCode =
  | "PROJECT_NOT_FOUND"
  | "CONFIG_INVALID"
  | "FILE_NOT_FOUND"
  | "READ_FAILED"
  | "UNKNOWN_DIRECTIVE"
  | "DIRECTIVE_RESERVED"
  | "DIRECTIVE_SYNTAX"
  | "IMPORT_NOT_FOUND"
  | "IMPORT_OUTSIDE_SRC"
  | "DUPLICATE_SECTION"
  | "DEPENDENCY_CYCLE"
  | "EMPTY_PROJECT"
  | "WRITE_FAILED"
  | "INTERNAL";

export interface MgrErrorLocation {
  file: string;
  line?: number;
  column?: number;
}

export interface MgrErrorOptions {
  code: MgrErrorCode;
  /** i18n key into `Messages.errors.byCode`. */
  messageKey: ErrorMessageKey;
  /** Placeholder values for both the message and the suggestion template. */
  params?: Record<string, string | number>;
  location?: MgrErrorLocation;
  directive?: string;
  /** Optional override for the suggestion (raw string, already localized). */
  suggestionOverride?: string;
  /** Optional override for the message (raw string, already localized). */
  messageOverride?: string;
  cause?: unknown;
}

export class MgrError extends Error {
  readonly code: MgrErrorCode;
  readonly messageKey: ErrorMessageKey;
  readonly params: Record<string, string | number>;
  readonly location?: MgrErrorLocation;
  readonly directive?: string;
  private readonly suggestionOverride?: string;
  private readonly messageOverride?: string;

  constructor(options: MgrErrorOptions) {
    // Resolve a stable technical message for `Error.message` — this is
    // what shows up in stack traces and node crash logs. Presentation
    // layer re-resolves against the live locale via `localizedMessage()`.
    super(
      options.messageOverride ??
        renderTemplate(getCatalogEntry(options.messageKey).message, options.params),
    );
    this.name = "MgrError";
    this.code = options.code;
    this.messageKey = options.messageKey;
    this.params = options.params ?? {};
    if (options.location !== undefined) this.location = options.location;
    if (options.directive !== undefined) this.directive = options.directive;
    if (options.suggestionOverride !== undefined) {
      this.suggestionOverride = options.suggestionOverride;
    }
    if (options.messageOverride !== undefined) {
      this.messageOverride = options.messageOverride;
    }
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** Localized message using the *current* locale. */
  localizedMessage(): string {
    if (this.messageOverride !== undefined) return this.messageOverride;
    const entry = getCatalogEntry(this.messageKey);
    return renderTemplate(entry.message, this.params);
  }

  /** Localized suggestion using the *current* locale. */
  localizedSuggestion(): string | undefined {
    if (this.suggestionOverride !== undefined) return this.suggestionOverride;
    const entry = getCatalogEntry(this.messageKey);
    if (!entry.suggestion) return undefined;
    return renderTemplate(entry.suggestion, this.params);
  }

  /** Human-readable multi-line report used by non-Ink consumers. */
  format(): string {
    const m = getMessages();
    const lines: string[] = [];
    lines.push(`${m.errors.header}: ${this.localizedMessage()}`);
    if (this.location) {
      lines.push("");
      lines.push(`${m.errors.file}:`);
      lines.push(this.location.file);
      if (this.location.line !== undefined) {
        lines.push("");
        lines.push(`${m.errors.line}:`);
        lines.push(String(this.location.line));
      }
    }
    if (this.directive) {
      lines.push("");
      lines.push(`${m.errors.directive}:`);
      lines.push(this.directive);
    }
    const suggestion = this.localizedSuggestion();
    if (suggestion) {
      lines.push("");
      lines.push(`${m.errors.suggestion}:`);
      lines.push(suggestion);
    }
    return lines.join("\n");
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      messageKey: this.messageKey,
      params: this.params,
      location: this.location,
      directive: this.directive,
    };
  }
}

/** Aggregated errors (validator returns many at once). */
export class MgrErrorList extends Error {
  readonly errors: MgrError[];

  constructor(errors: MgrError[]) {
    super(`${errors.length} error(s) reported`);
    this.name = "MgrErrorList";
    this.errors = errors;
  }
}

function getCatalogEntry(
  key: ErrorMessageKey,
): { message: string; suggestion: string } {
  return getMessages().errors.byCode[key];
}

function renderTemplate(
  template: string,
  params?: Record<string, string | number>,
): string {
  return format(template, params);
}
