# my-business

Annotated scaffold for a **business simulation** Game Package. Every
file is a `@section` placeholder — fill in the `<!-- TODO: ... -->`
blocks to design your own shopkeeping, tycoon, or supply-chain game.

## Layout

```
src/
  main.md        # entry — imports the sections below in PRD order
  metadata.md    # PRD-008 §4 — name, author, description, runtime, version
  world.md       # PRD-008 §5 — time, setting, economy, physics, culture
  state.md       # PRD-008 §6 — variables and invariants
  entities.md    # PRD-008 §7 — persistent + transient entities
  rules.md       # PRD-008 §8 — formulas + Guard/Transformation/Trigger rules
  events.md      # PRD-008 §9 — Pre / Post events
  actions.md     # PRD-008 §10 — player actions and auto-actions
  ending.md      # PRD-008 §11 — Win / Lose / Soft / Hard endings
  ui.md          # PRD-008 §12 — dashboard + summary content
  start.md       # PRD-008 §13 — initial state and opening narration
```

## How to use it

```bash
mgr validate       # check your changes against the schema
mgr build          # produce dist/my-business-0.1.0.md
```

The bundle is a Prompt Specification — feed it to an LLM runtime.

## Why this structure

This template mirrors `tests/reference-games/lemonade/`. Lemonade is the
canonical MGR Reference Game — a small business-simulation written to
exercise every PRD section. Every directive, every block header, every
inline citation in this template follows the same style.

To see a complete working example, read `tests/reference-games/lemonade/`
from `metadata.md` to `start.md`. To see a second example in a different
genre, read `tests/reference-games/hangman/`.

## Workflow

1. Edit `metadata.md` first — title, description, runtime, version.
2. Edit `world.md` — pick a Time scale (day / week / month) and an
   Economy (currency, supply rules).
3. Declare your variables in `state.md` (Public / Private / Hidden) and
   your invariants.
4. Declare entities in `entities.md`. Most business-sims need a
   `Player`, a `Business`, and a `Customer` (Transient).
5. Write the formulas in `rules.md` first (e.g. `Demand`, `Spoilage`),
   then the rules that read them (Guards + Transformations for each
   action, plus Triggers for end-of-day).
6. Add Events in `events.md` — Pre Events set up the day, Post Events
   react to it.
7. List Actions in `actions.md` — the player-facing surface.
8. Define endings in `ending.md` (Win / Lose minimum).
9. Configure UI in `ui.md` — what shows on the dashboard, what
   appears in the end-of-day summary.
10. Fill in `start.md` — initial values + opening narration.

Run `mgr validate` after each section; the pipeline reports missing
blocks, duplicate declarations, and unknown directives.

## Renaming

Change `name` in `mgr.config.json`. The bundle filename becomes
`dist/<name>-<version>.md`.
