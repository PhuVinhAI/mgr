# my-game

A blank MGR Game Package scaffold. Everything in here is a placeholder —
edit or delete the `<!-- TODO: ... -->` blocks to build your own game.

## What you got

```
src/
  main.md        # entry — imports the sections below
  metadata.md    # PRD-008 §4 — name, author, description, runtime, version
  world.md       # PRD-008 §5 — time, setting, economy, physics, culture
  state.md       # PRD-008 §6 — variables and invariants
  start.md       # PRD-008 §13 — initial state and opening narration
```

The commented-out `@import` lines in `main.md` are the optional sections.
Uncomment them (and create the matching file) when your game needs them:

| Section         | File             | When you need it                                          |
|-----------------|------------------|-----------------------------------------------------------|
| `entities`      | `entities.md`    | The game has named actors (Player, NPC, Item, …)          |
| `rules`         | `rules.md`       | The game has automatic logic on Actions / Events          |
| `events`        | `events.md`      | Random or scheduled things happen during play            |
| `actions`       | `actions.md`     | The player has choices that aren't just free-form input  |
| `ending`        | `ending.md`      | The game has Win / Lose / Soft-ending conditions          |
| `ui`            | `ui.md`          | You want to customise what shows on the dashboard        |

## How to use it

```bash
mgr validate       # check your changes don't break the schema
mgr build          # produce dist/my-game-0.1.0.md
```

The bundled `.md` file is a Prompt Specification — feed it to an LLM
runtime to play.

## Learn by example

The canonical MGR Game Package is `tests/reference-games/lemonade/`. Read
its `gaps.md` first, then any `src/*.md` file in declaration order. Every
directive in this template copies that style.

For a working but minimal second example, see
`tests/reference-games/hangman/`.

## Renaming

Change `name` in `mgr.config.json`. The bundle filename becomes
`dist/<name>-<version>.md`.
