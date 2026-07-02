# Gaps — Lemonade Reference Game

This file logs every place where writing Lemonade forced a decision the
current PRDs (001–008) do **not** cover.

Each entry is a signal that the Kernel is missing a specification. Fixing
a gap means writing (or amending) a PRD, not patching the game.

---

## How to file a gap

Add a new `### GAP-NNN` entry. Keep the format tight — the goal is a
diff-able ledger, not prose.

```
### GAP-NNN — <short title>

**File:** `src/<file>.md` (the spot where you were stuck)
**PRDs consulted:** PRD-XXX §Y, PRD-ZZZ §Q
**Category:** <see list below>

**What I needed to decide:**
<one paragraph — the exact question that had no answer>

**What the PRDs say:**
<quote or paraphrase the closest existing text; write "nothing" if none>

**What I did instead:**
<one of: TODO(gap) marker; picked X arbitrarily and flagged it; skipped>

**Proposed resolution:**
<one sentence — the shape of the PRD change that would close this>

**Resolution (if closed):**
<link to the PRD / section that closed the gap>
```

## Categories

Use these tags so gaps can be grouped when triaging:

- `state`         — State schema, visibility, invariants, derived values
- `lifecycle`     — Turn phases, ordering, atomicity
- `rule`          — Rule expression, priority, formula
- `event`         — Event triggers, scheduling, queueing
- `ui`            — What the player sees, layout, dashboard
- `entity`        — Entity modelling, relationships
- `package`       — GPS metadata, validation, file layout
- `runtime`       — LLM behaviour not covered elsewhere
- `formula`       — Anything numeric: pricing, demand curves, probability
- `narrative`     — Text generation, tone, template

Add a new category only if none of the above fit — and mention that fact
in the entry.

---

## Status

- [x] Author has walked all 11 GPS sections for Lemonade
- [x] All arbitrary decisions carry a `TODO(gap)` in-source
- [x] Every `TODO(gap)` has a matching entry below
- [x] Gaps triaged into PRD amendments and new PRDs
- [x] Lemonade rewritten to use the resolved syntax
- [x] Compiler + tests updated to enforce the new surface

---

## Gaps

### GAP-001 — Hidden State has no declaration syntax  ✅ CLOSED

**File:** `src/hidden.md`
**PRDs consulted:** PRD-006 §11 (Hidden State), §16 (State Visibility), PRD-008 §6 (State Schema)
**Category:** state

**What I needed to decide:**
How does a Game Package declare that `TodayDemand` is a Hidden variable,
not a Public one? And how does the Bundler mark it so the Runtime knows
to withhold it from every UI surface?

**What the PRDs say:**
PRD-006 §11 says Hidden State exists and "Player must not see it".
PRD-006 §16 lists Public / Private / Hidden as visibility levels.
Neither PRD specifies a syntax for a Game to *declare* a variable as
Hidden, and PRD-003 (PSF) does not define how visibility is preserved
into the Prompt Specification.

**What I did instead:**
Split `state.md` into visible variables and imported `hidden.md` for
the rest. Relies on section names ("Hidden") to signal intent —
completely informal.

**Resolution:**
- PRD-006 v1.1 §11a *Visibility Declaration* — canonical `Variable
  Foo / Visibility: Public|Private|Hidden` form.
- PRD-003 v1.1 §9a *Visibility Preservation* — Bundler emits `[Public]
  / [Private] / [Hidden]` labels so the Runtime knows what to hide.
- Runtime `state-contract` body updated (v1.4) to teach the LLM the
  three-level model.
- `state.md` and `hidden.md` rewritten to use the new syntax.

---

### GAP-002 — No spec for transient / per-turn entities  ✅ CLOSED

**File:** `src/entities.md`
**PRDs consulted:** PRD-008 §7 (Entity Definition), PRD-006 §5 (Entity)
**Category:** entity

**What I needed to decide:**
`Cup` exists only inside Simulation Phase — it is created, priced, sold,
and discarded within a single Turn. Is it an Entity in the PRD-006 sense
(needs a unique identity, participates in State), or is it something
else the PRDs have no name for?

**What the PRDs say:**
PRD-006 §5 requires every Entity to have "a unique identifier within the
game" and treats Entities as persistent State. PRD-008 §7 requires every
Entity to declare attributes, behaviour, and relationships. Neither PRD
distinguishes transient computational objects from persistent ones.

**What I did instead:**
Declared `Cup` as an Entity with a note that it "lives only inside a
single Simulation Phase". Semantics were dangling.

**Resolution:**
- PRD-006 v1.1 §5a *Transient Entity* — `Kind: Persistent | Transient`
  + `Lifetime: <Phase | Turn>` declaration.
- Runtime `state-contract` body updated (v1.4) to explain
  Persistent vs Transient.
- `entities.md` rewritten: Cup now declares `Kind: Transient, Lifetime:
  Simulation Phase`.

---

### GAP-003 — No notation for numeric / formula rules  ✅ CLOSED

**File:** `src/rules.md`
**PRDs consulted:** PRD-008 §8 (Rules), PRD-006 §15 (Derived State)
**Category:** formula

**What I needed to decide:**
How to write "higher Price reduces Customers, higher Reputation
increases Customers, Weather modulates Customers" in a form the Runtime
can evaluate the same way every day.

**What the PRDs say:**
PRD-008 §8: rules "describe conditions, limits, results" — good for
discrete guards like `Money >= Salary`, silent on continuous
relationships. PRD-006 §15 (Derived State) is read-side only ("Runtime
calculates when needed") and gives no expression syntax.

**What I did instead:**
Wrote the relationships in prose. Runtime would have to invent the
formula turn-by-turn, breaking determinism (PRD-004).

**Resolution:**
- **PRD-009 Formula System** — new PRD covering values, references,
  arithmetic, comparison, boolean, piecewise, bounds, monotonic hints,
  aggregation, deterministic randomness, and named formulas.
- `rules.md` rewritten to use named formulas (`BaseDemand`,
  `WeatherModifier`, `CustomersToday`) and `Monotonic(...)` hints.

---

### GAP-004 — Turn Lifecycle assumes Events run *after* Simulation  ✅ CLOSED

**File:** `src/events.md`
**PRDs consulted:** PRD-005 §3 (Architecture), §7 (Event Phase), §15 (Event Queue)
**Category:** lifecycle

**What I needed to decide:**
Heat Wave changes the cup recipe (ice-per-cup goes from 1 to 2) for the
day. The Simulation must know the recipe before it starts computing
sales. But PRD-005 §3 put Event Phase strictly after Simulation Phase.

**What the PRDs say:**
PRD-005 §3 diagram: Input → Validation → Simulation → Event → Commit.
PRD-005 §20 made this an invariant. There was no "pre-Simulation Event"
slot for environmental setup like weather.

**What I did instead:**
Documented the weather roll as a pseudo-event that fires at "start of
day", flagged the conflict.

**Resolution:**
- **PRD-005 v1.1** — Event Phase split into §7 *Pre Event Phase*
  (before Simulation) and §7a *Post Event Phase* (after Simulation).
- §3 diagram, §15 Event Queue, and §20 Lifecycle Invariants all
  updated. Pre and Post queues are distinct.
- Runtime `turn-loop` body updated (v1.4) — 7 phases, 11 numbered
  steps, invariants list expanded.
- `events.md` rewritten: Weather + Heat Wave in Pre Event Queue,
  Festival in Post Event Queue.

---

### GAP-005 — Rule structure is prose, not machine-readable  ✅ CLOSED

**File:** `src/rules.md`, `src/actions.md`
**PRDs consulted:** PRD-008 §8 (Rules), PRD-008 §10 (Actions)
**Category:** rule

**Source:** Identified by user during triage after Lemonade v0 review.

**What I needed to decide:**
Each Rule was written as free English ("To buy N lemons: Money must be
>= N × 5 cents"). Runtime had to parse intent — which part is the
Precondition, which is the Effect, what fires it, in which phase, and
what to do if two Rules match at once. In a large game (Game Dev
Tycoon: 200 rules), this would collapse.

**What the PRDs say:**
PRD-008 §8 declares Rules as "conditions, limits, results" but gives
no schema for those parts. PRD-005 §8 defines rule priority ordering
across layers but not within a game.

**What I did instead:**
Wrote English prose. Everything was implicit.

**Resolution:**
- **PRD-010 Rule Language** — new PRD covering Rule kinds
  (Guard/Transformation/Trigger), the four blocks (Trigger,
  Precondition, Effect, Priority), composition, validation, and debug.
- `rules.md` rewritten: every rule now has an explicit `Rule <Name>` /
  `Kind:` / `Trigger:` / `Precondition:` / `Effect:` block.

---

## Triage summary

All 5 gaps closed by 2 new PRDs + 3 amendments:

| Gap | Resolution |
| --- | --- |
| GAP-001 | PRD-006 v1.1 §11a + PRD-003 v1.1 §9a |
| GAP-002 | PRD-006 v1.1 §5a |
| GAP-003 | **PRD-009 (new)** — Formula System |
| GAP-004 | PRD-005 v1.1 §7 + §7a |
| GAP-005 | **PRD-010 (new)** — Rule Language |

**Code impact:**
- `RUNTIME_SPEC_VERSION` bumped 1.3 → 1.4 (turn-loop + state-contract).
- `PSF_SPEC_VERSION` bumped 1.0 → 1.1 (visibility preservation).
- 17 new directive names reserved for future syntax (PRD-005/006/009/010).
- 3 runtime tests updated + 2 new tests added; 61/61 passing.

**Next step:**
Reference Game #2 to expose gaps NOT covered by Lemonade. Candidates:

- Tic-Tac-Toe → tests adversary/turn-of, End Conditions symmetry
- Hangman → tests progressive reveal (Private → Public transitions)
- Business Mini → tests multiple Persistent Entities + Collections

Choose based on what Lemonade did not stress.
