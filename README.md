# MGR — Markdown Game Runtime

> A compiler for Prompt Programming. Markdown is source code. LLM is runtime. MGR is the compiler.

Foundation implements PRD-001 (`docs/001-prd.md`): Parser → Project Graph → Validator → Bundler → Optimizer → Prompt Specification.

## Quick start

```bash
# Install dependencies
npm install

# Build the compiler
npm run build

# Try it on a fresh project
mkdir demo && cd demo
node ../dist/cli/index.js init
node ../dist/cli/index.js build
```

`dist/<name>-<version>.md` is the single Prompt Specification produced from your Markdown sources — a `my-game@0.1.0` project builds to `dist/my-game-0.1.0.md`. Set `out` in `mgr.config.json` to override.

## CLI

```
mgr init       # Scaffold a new project from a built-in template
mgr build      # Compile into a single Prompt Specification
mgr validate   # Validate without producing output
mgr doctor     # Report environment and project health
```

Global options:
- `--lang <en|vi>` — CLI and template language (defaults to `MGR_LANG`, then `LANG`, then `en`).
- `--template <name>` — built-in template to scaffold from (default: `blank`). See [Templates](#templates).
- `--help`, `--version`.

## Templates

`mgr init` copies a built-in template into the current directory. Templates
are organised as `templates/<name>/<lang>/`; the CLI picks the `<lang>`
folder that matches your `--lang` (or the auto-detected locale).

| Name           | What it gives you                                                                |
|----------------|----------------------------------------------------------------------------------|
| `blank`        | Minimal scaffold — `mgr.config.json` + four `@section` files (metadata, world, state, start) with `<!-- TODO -->` blocks. Best starting point for any game. |
| `business-sim` | Full Game Package skeleton — eleven `@section` files mirroring the canonical Lemonade Reference Game, each annotated with PRD citations and example directives. Designed for shopkeeping / tycoon / supply-chain games. |

Both templates ship in `en` and `vi`. Pick the language explicitly or let
MGR auto-detect it.

### Examples

```bash
mgr init                              # blank, auto-detected language
mgr init --template blank --lang en   # explicit blank in English
mgr init --template blank --lang vi   # explicit blank in Vietnamese
mgr init --template business-sim      # business-sim, auto-detected language
mgr init --template business-sim --lang vi
```

If the requested `(template, lang)` pair does not ship, MGR prints an
error listing every available template:

```
Template "foo (vi)" not found. Available templates: blank, business-sim.
```

### Templates are scaffolds, not finished games

Every file in every template is a `@section` placeholder. The
`business-sim` template includes a few example `@variable`, `@rule`,
and `@event` blocks to demonstrate the syntax, but most blocks are
`<!-- TODO: ... -->` markers pointing at the PRD section they belong to.

For a complete working Game Package in this style, read
`tests/reference-games/lemonade/`. For a second example in a different
genre, read `tests/reference-games/hangman/`.

## Project layout (PRD §8)

```
project/
  mgr.config.json
  src/
  dist/
```

`mgr.config.json` (from the `blank` template):

```json
{
  "name": "my-game",
  "version": "0.1.0",
  "entry": "main.md",
  "srcDir": "src",
  "outDir": "dist"
}
```

The `business-sim` template also ships `name: "my-business"`. Edit
`name` in `mgr.config.json` to rename your project.

`out` is optional; when omitted the pipeline writes `dist/<name>-<version>.md`.

## Directives (PRD §10)

- `@import <path>` — include another Markdown file (relative to current, or `/`-prefixed = srcDir root).
- `@section <id>` — open a named section (emitted as an H2).
- `@variable`, `@entity`, `@rule`, `@formula`, `@event`, `@action`, `@auto-action` — first-class Game Package declarations used by full PRD-008 packages.

Unknown directives are rejected with a fix suggestion.

## Architecture

```
src/
  errors/       # MgrError model (file/line/directive/suggestion)
  logger/       # Structured event sink; Ink renders it
  config/       # mgr.config.json schema (zod)
  parser/       # Line-based directive parser → AST
  graph/        # Project Graph + cycle detection + topo order
  validator/    # Duplicate sections, empty project, ...
  bundler/      # Concatenate in topo order → Prompt Specification
  optimizer/    # Whitespace / line-ending normalization (lossless)
  pipeline.ts   # Compile orchestrator
  i18n/         # en + vi catalogs
  cli/          # Ink (React) CLI: commands + components
templates/      # Built-in scaffolds shipped with the compiler
  blank/
    en/         # English blank scaffold (metadata, world, state, start)
    vi/         # Vietnamese blank scaffold
  business-sim/
    en/         # English business-sim scaffold (11 sections, mirrored from Lemonade)
    vi/         # Vietnamese business-sim scaffold
tests/
  reference-games/
    lemonade/   # Canonical business-sim Reference Game — full working package
    hangman/    # Reference Game #2 — word-guess genre
```

## Determinism

Same source → same output (PRD §4.3, §15). No `Date.now()` in output; deterministic DFS ordering.

## Scripts

```
npm run build     # tsup → dist/
npm run typecheck # tsc --noEmit
npm test          # vitest
npm run lint      # eslint
npm run format    # prettier
npm run mgr       # dev: run CLI via tsx
```
