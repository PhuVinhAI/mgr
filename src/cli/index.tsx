#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import * as path from "node:path";
import * as url from "node:url";
import { readdirSync, existsSync } from "node:fs";
import { setLocale, getMessages, getLocale, type Locale } from "../i18n/index.js";
import { HelpScreen } from "./commands/Help.js";
import { BuildCommand } from "./commands/Build.js";
import { ValidateCommand } from "./commands/Validate.js";
import { InitCommand } from "./commands/Init.js";
import { DoctorCommand } from "./commands/Doctor.js";

const PKG_VERSION = "0.1.0";
const DEFAULT_TEMPLATE = "blank";

/**
 * Resolve the bundled templates root directory.
 *
 * Both when running from `dist/cli/index.js` (production) and from
 * `src/cli/index.tsx` (dev via tsx) the templates folder sits two levels
 * up. Kept next to the source file so the same relative path works in
 * either case.
 */
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.resolve(HERE, "..", "..", "templates");

/**
 * Locale must be resolved BEFORE meow renders its help text, because
 * meow eagerly formats the usage string during construction.
 * Priority: --lang <value> > --lang=<value> > env auto-detect (already
 * applied on module load inside i18n/).
 */
{
  const argv = process.argv.slice(2);
  const idx = argv.findIndex(
    (a) => a === "--lang" || a.startsWith("--lang="),
  );
  if (idx >= 0) {
    const token = argv[idx] ?? "";
    const value = token.includes("=")
      ? token.split("=")[1]
      : argv[idx + 1];
    const lower = (value ?? "").toLowerCase();
    if (lower === "en" || lower === "vi") setLocale(lower as Locale);
  }
}

const cli = meow(getMessages().cli.meowHelp, {
  importMeta: import.meta,
  flags: {
    lang: { type: "string" },
    template: { type: "string" },
    help: { type: "boolean", shortFlag: "h" },
    version: { type: "boolean", shortFlag: "v" },
  },
  autoHelp: false,
  autoVersion: false,
});

if (cli.flags.version) {
  console.log(PKG_VERSION);
  process.exit(0);
}

/**
 * List available built-in templates. A template is any directory under
 * TEMPLATES_ROOT. Deterministic (sorted) so output order matches across
 * platforms.
 */
function listAvailableTemplates(): string[] {
  if (!existsSync(TEMPLATES_ROOT)) return [];
  return readdirSync(TEMPLATES_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function resolveTemplateDir(name: string, lang: Locale): string {
  return path.join(TEMPLATES_ROOT, name, lang);
}

const command = cli.input[0];
const root = process.cwd();

if (!command || cli.flags.help) {
  render(<HelpScreen version={PKG_VERSION} />);
} else {
  switch (command) {
    case "init": {
      const templateName = cli.flags.template ?? DEFAULT_TEMPLATE;
      const lang = getLocale();
      const templateDir = resolveTemplateDir(templateName, lang);
      if (!existsSync(templateDir)) {
        const m = getMessages();
        const available = listAvailableTemplates().join(", ");
        console.error(
          m.init.unknownTemplate
            .replace("{name}", `${templateName} (${lang})`)
            .replace("{available}", available || "(none)"),
        );
        process.exit(1);
      }
      render(<InitCommand root={root} templateDir={templateDir} template={templateName} />);
      break;
    }
    case "build":
      render(<BuildCommand root={root} />);
      break;
    case "validate":
      render(<ValidateCommand root={root} />);
      break;
    case "doctor":
      render(<DoctorCommand root={root} />);
      break;
    default: {
      const m = getMessages();
      console.error(m.cli.unknownCommand.replace("{name}", command));
      process.exit(1);
    }
  }
}
