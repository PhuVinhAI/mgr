/**
 * Tiny i18n runtime.
 *
 * Locale resolution order:
 *   1. explicit `setLocale()` call (or CLI `--lang`)
 *   2. env `MGR_LANG`
 *   3. env `LANG` / `LC_ALL` (matched prefix)
 *   4. default: `en`
 *
 * Placeholders: `{name}` substituted from a plain object.
 */
import { en } from "./en.js";
import { vi } from "./vi.js";
import type { Locale, Messages } from "./types.js";

const CATALOGS: Record<Locale, Messages> = { en, vi };

let currentLocale: Locale = detectLocale();

export function detectLocale(): Locale {
  const explicit = normalize(process.env["MGR_LANG"]);
  if (explicit) return explicit;
  const sys = normalize(
    process.env["LC_ALL"] ?? process.env["LANG"] ?? undefined,
  );
  if (sys) return sys;
  return "en";
}

function normalize(raw: string | undefined): Locale | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.startsWith("vi")) return "vi";
  if (lower.startsWith("en")) return "en";
  return undefined;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getMessages(locale: Locale = currentLocale): Messages {
  return CATALOGS[locale];
}

export function format(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

/** Convenience: shorthand access. `t(m => m.cli.tagline)`. */
export function t(pick: (m: Messages) => string): string;
export function t(
  pick: (m: Messages) => string,
  params: Record<string, string | number>,
): string;
export function t(
  pick: (m: Messages) => string,
  params?: Record<string, string | number>,
): string {
  const msg = pick(getMessages());
  return params ? format(msg, params) : msg;
}

export type { Locale, Messages } from "./types.js";
