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

`dist/<name>-<version>.md` is the single Prompt Specification produced from your Markdown sources — a `hello-mgr@0.1.0` project builds to `dist/hello-mgr-0.1.0.md`. Set `out` in `mgr.config.json` to override.

## CLI

```
mgr init       # Create a new project from the built-in template
mgr build      # Compile into dist/<name>-<version>.md
mgr validate   # Validate without producing output
mgr doctor     # Report environment and project health
```

Global options:
- `--lang <en|vi>` — CLI language (defaults to `MGR_LANG`, then `LANG`, then `en`).
- `--help`, `--version`.

## Project layout (PRD §8)

```
project/
  mgr.config.json
  src/
  dist/
```

`mgr.config.json`:
```json
{
  "name": "hello-mgr",
  "version": "0.1.0",
  "entry": "main.md",
  "srcDir": "src",
  "outDir": "dist"
}
```

`out` is optional; when omitted the pipeline writes `dist/<name>-<version>.md`.

## Directives (PRD §10)

- `@import <path>` — include another Markdown file (relative to current, or `/`-prefixed = srcDir root).
- `@section <id>` — open a named section (emitted as an H2).

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
