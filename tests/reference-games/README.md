# Reference Games

**These are not games. They are conformance tests for the MGR Kernel.**

Each folder here is a minimal Game Package written to exercise a specific set
of PRD sections. If a Reference Game cannot be described fully by the current
PRDs, that is **not a bug in the game** — it is a signal that the Kernel is
missing a specification.

This directory is the analogue of Web Platform Tests for browsers or the TCK
for the JVM: a shared set of programs that any implementation of the Kernel
must be able to describe and run.

---

## Current games

| Game            | Purpose (what it stresses)                                     | Status  |
| --------------- | -------------------------------------------------------------- | ------- |
| `lemonade/`     | Economy, Events, Variables, Hidden State, Simulation, UI       | Draft   |

Additional games (Tic-Tac-Toe, Hangman, Business Mini) are **not yet added on
purpose**. Game #2 will be chosen based on which gaps Lemonade exposes, not
from a fixed list. See `lemonade/gaps.md`.

---

## Gap Detection Protocol

The point of this exercise is to expose holes in the PRDs. To keep the signal
clean, every author (human or agent) working on a Reference Game must follow
these rules:

1. **Cite the PRD.** Every design decision in a game file must be traceable
   to a PRD section (e.g. `PRD-006 §11 Hidden State`). Cites go in the file
   as a Markdown comment on the line where the decision is made.

2. **STOP on missing spec.** If a decision cannot be cited, the author must
   **not** invent one. Instead:
   - Leave a `TODO(gap)` marker in the game file at that spot.
   - Add an entry to `gaps.md` in the game's folder.
   - Continue with the rest of the game where possible.

3. **Success is measured in gaps, not in playability.** A Reference Game
   that builds cleanly with zero `gaps.md` entries either (a) means the
   Kernel is complete for its scope, or (b) means the game is too shallow
   to be a useful test. Both need review.

4. **No plugin, no extension.** Reference Games use only the surface area
   defined by PRDs 001–008. If something feels like it wants a plugin, that
   is a gap, not a workaround.

---

## Reading a game folder

```
lemonade/
  mgr.config.json      # Package config (PRD-008 §4 Metadata)
  gaps.md              # Detected gaps in the Kernel (living document)
  src/
    main.md            # Entry point — imports the rest
    metadata.md        # PRD-008 §4
    world.md           # PRD-008 §5
    state.md           # PRD-008 §6 + PRD-006
    entities.md        # PRD-008 §7
    rules.md           # PRD-008 §8
    events.md          # PRD-008 §9
    actions.md         # PRD-008 §10
    ending.md          # PRD-008 §11 Victory & Failure
    ui.md              # PRD-008 §12
    start.md           # PRD-008 §13 Start Scenario
```

The `gaps.md` file is the most important artefact in each folder. Read it
before reading the game.
