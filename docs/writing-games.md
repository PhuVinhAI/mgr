# Writing Games with MGR

> A practical guide for authoring Prompt Programming Game Packages.

This guide assumes you already know what MGR is (a Markdown → Prompt
Specification compiler). If you need the high-level pitch first, read
[`README.md`](../README.md). For the formal specification, see
`docs/001-prd.md` through `docs/014-prd.md`. This document sits between
those two: enough structure to design a game, enough examples to copy
from.

---

## Table of contents

1. [Mental model](#1-mental-model)
2. [Quick start](#2-quick-start)
3. [Project layout](#3-project-layout)
4. [Directives reference](#4-directives-reference)
5. [Section files](#5-section-files)
6. [Variables and visibility](#6-variables-and-visibility)
7. [Entities](#7-entities)
8. [Rules](#8-rules)
9. [Events](#9-events)
10. [Actions](#10-actions)
11. [Formulas](#11-formulas)
12. [Ending](#12-ending)
13. [UI configuration](#13-ui-configuration)
14. [Start scenario](#14-start-scenario)
15. [Naming conventions](#15-naming-conventions)
16. [Validation and common errors](#16-validation-and-common-errors)
17. [Recommended writing workflow](#17-recommended-writing-workflow)
18. [Reference games and templates](#18-reference-games-and-templates)

---

## 1. Mental model

MGR takes a folder of Markdown files and produces a single
**Prompt Specification** — one big `.md` file that an LLM reads to play
the game. Three things to keep in mind:

```
Markdown sources       Game Package     ← you write this
        │
        ▼
   MGR compiler         (mgr build)
        │
        ▼
Prompt Specification   dist/foo-0.1.0.md  ← single artifact
        │
        ▼
      LLM acts as Runtime, reads the spec, plays the game
```

- **You write Markdown.** No DSL, no JSON for gameplay. Sections,
  variables, rules, events, actions, formulas are declared with
  directives that look like `@rule Buy Stock` and `Purpose: …`.
- **The LLM is the runtime.** It executes the rules, mutates state,
  renders the dashboard. You never write engine code.
- **The compiler is deterministic.** Same source → same output. Two
  builds of an unchanged project produce byte-identical bundles.

Every Game Package follows the same skeleton (PRD-008 §3). A
**metadata** block identifies the package. A **world** describes the
setting. A **state** declares variables and invariants. **Entities**
name the actors. **Rules** automate state changes. **Events** add
randomness and reaction. **Actions** are the player surface.
**Ending** declares win/lose. **UI** configures what the dashboard
shows. **Start** declares initial values and the opening turn.

The skeleton is consistent because the LLM-runtime has a fixed turn
lifecycle (PRD-004, PRD-005): *Input → Validation → Pre Event →
Simulation → Post Event → State Commit → Response*. Your sections
plug into the slots in that lifecycle.

---

## 2. Quick start

```bash
# Scaffold a new project
mkdir my-game && cd my-game
mgr init --template blank --lang en

# Edit the placeholder files under src/, then:
mgr validate       # schema + semantic checks
mgr build          # emit dist/my-game-0.1.0.md
```

`mgr init` ships two templates today:

- `blank` — minimal scaffold (metadata, world, state, start). Use it
  for any game that doesn't fit a known genre.
- `business-sim` — full 11-section skeleton mirroring the canonical
  Lemonade Reference Game. Use it for shopkeeping / tycoon /
  supply-chain games.

Both ship in English and Vietnamese. Add `--lang vi` for the
Vietnamese copy. The chosen language only affects the prompts and
inline comments inside the scaffold; the compiler behaviour is
identical.

`mgr build` produces one file. The filename is `dist/<name>-<version>.md`
by default — override with `out` in `mgr.config.json`. Same input,
same output, every build.

`mgr validate` is fast — run it after every meaningful edit. It catches
the 80% of mistakes you'll make (missing blocks, wrong visibility,
typo in a directive name, import cycle, etc.).

---

## 3. Project layout

```
my-game/
  mgr.config.json     # package metadata (name, version, entry, dirs)
  src/
    main.md           # entry — imports every other section file
    metadata.md       # @section metadata — name, author, runtime, …
    world.md          # @section world — setting and world rules
    state.md          # @section state — variables and invariants
    entities.md       # @section entities — actors (optional)
    rules.md          # @section rules — automation (optional)
    events.md         # @section events — pre/post event triggers (optional)
    actions.md        # @section actions — player choices (optional)
    ending.md         # @section ending — win/lose conditions
    ui.md             # @section ui — dashboard configuration
    start.md          # @section start — initial state and opening
    hidden.md         # @section hidden-state — hidden variables (optional)
  dist/               # output directory — one .md per build
```

`mgr.config.json`:

```json
{
  "name": "my-game",
  "version": "0.1.0",
  "entry": "main.md",
  "srcDir": "src",
  "outDir": "dist"
}
```

`entry` is the first file the compiler reads. Conventionally it
imports every other section in declaration order. `out` is optional —
if omitted, the bundle lands at `dist/<name>-<version>.md`. Add
`"runtime": "1.x"` if you want to pin to a Runtime major.

Files outside `srcDir` are rejected at build time. Files referenced
by `@import` are resolved relative to the importing file, or anchored
at `srcDir` if the path starts with `/`.

---

## 4. Directives reference

Every block of structure in your game starts with a directive. Most of
them are "first-class" — a directive header followed by `Block: value`
lines. A few older "legacy prose" forms still work for backwards
compatibility, but you should write the first-class form.

### `@import <path>`

Pulls another Markdown file into the current file. The path is
relative to the current file unless it starts with `/`, in which case
it is anchored at `srcDir`.

```markdown
@import state.md
@import /world.md          # same as srcDir/world.md
```

### `@section <id>`

Opens a named section. The id is emitted as an H2 heading in the
bundle. Section ids must be unique across the whole project
(PRD-008 §10, validation §DUPLICATE_SECTION).

```markdown
@section rules
```

The first-class block-declaration directives below are placed *inside*
the section they belong to.

### `@variable <Name>`

Declares a single state variable. Block style:

```markdown
@variable Money
Visibility: Public
Purpose:
Cash on hand. Game ends if this drops below zero.
```

Required: the name on the directive line.
Optional blocks: `Visibility`, `Purpose`. See
[§6 Variables and visibility](#6-variables-and-visibility).

### `@entity <Name>`

Declares a named actor (Player, Business, NPC, Item, …). Block style:

```markdown
@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Owns the Business and decides actions each turn.
Relationships:
Owns one Business; hires Staff.
```

Required: name on the directive line, `Kind:` block.
Optional: `Attributes`, `Behaviour`, `Relationships`, `Lifetime` (only
for Transient entities), `Purpose`. See [§7 Entities](#7-entities).

### `@rule <Name>`

Declares one piece of automation. Block style:

```markdown
@rule CanBuyStock
Kind: Guard
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Purpose:
Block Buy Stock when the player cannot afford the total.
Failure:
Reject action; ApplyBuyStock does not fire.
```

Required: name on the directive line, `Kind:`, `Trigger:`.
Conditional: `Precondition:`, `Effect:`, `Priority:`.
Documentation: `Purpose:`, `Failure:` (recommended for Guards and
Transformations per PRD-014). See [§8 Rules](#8-rules).

### `@formula <Name>`

Declares a named expression. The body is a single expression, a
piecewise (`When/Then/Otherwise`), or a reference to another Named
Formula. Block style:

```markdown
@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Baseline customers before modifiers.
```

Required: name on the directive line, a body line(s).
Recommended: `Purpose:` (PRD-014). See [§11 Formulas](#11-formulas).

### `@event <Name>`

Declares a scheduled or triggered event. Block style:

```markdown
@event Weather Roll
Phase: Pre
Trigger:
Start of Day.
Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)
Purpose:
Roll today's weather before Simulation reads demand.
```

Required: name, `Phase:`, `Trigger:`.
Conditional: `Effect:`, `Precondition:`.
Recommended: `Purpose:`. See [§9 Events](#9-events).

### `@action <Name>`

Declares a player choice. Block style:

```markdown
@action Buy Stock
Intent:
buy stock
purchase stock
restock
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * UnitCost
Purpose:
Let the player convert Money into Stock inventory.
Failure:
Reject when funds are insufficient; state does not change.
```

Required: name, `Intent:` (one or more phrases).
Conditional: `Parameters:`, `Preconditions:`.
Recommended: `Purpose:`, `Failure:`. See [§10 Actions](#10-actions).

### `@auto-action <Name>`

Declares a runtime-emitted action (e.g. end-of-day). Block style:

```markdown
@auto-action End Day
Fires When:
Stock = 0 OR Customers = 0 OR Day >= MaxDay
Purpose:
Close the day once the business can no longer sell.
```

Required: name, `Fires When:`.
Recommended: `Purpose:`. See [§10 Actions](#10-actions).

### `<!-- PRD-NNN §X.Y -->`

Not a directive — a Markdown HTML comment. The reference games embed
PRD section citations on the line where each design decision is made
(see [§15 Naming conventions](#15-naming-conventions)). The compiler
ignores comments; humans and reviewers benefit.

---

## 5. Section files

A Game Package is a directory of section files. Each file declares one
`@section` and contains the blocks that belong to that section. The
section files mirror the structure of the canonical Lemonade Reference
Game (PRD-008 §3).

### `main.md`

The entry file. Imports every other section in declaration order. Most
projects keep the order:

```
metadata → world → state → entities → rules → events → actions → ending → ui → start
```

Hidden variables may live in a separate file imported from `state.md`
(see Lemonade's `hidden.md`). State-contract, UI-contract, and
output-contract each live in their own file in Lemonade; for simpler
games you can fold them into `state.md`, `ui.md`, and `start.md`.

### `metadata.md`

Required blocks (PRD-008 §4):

- `Name:` — package title
- `Author:` — author / org
- `Description:` — one paragraph, genre and player goal
- `Runtime:` — Runtime major (`1.x` is safe today)
- `Package:` — semver

### `world.md`

Optional blocks (PRD-008 §5):

- `Time:` — how time advances (turn = day, turn = action, …)
- `Setting:` — where the game takes place
- `Economy:` — money / supply / demand rules
- `Physics:` — world laws (spoilage, decay, range)
- `Culture:` — social rules, factions, norms

Skip a block to leave the topic to the runtime.

### `state.md`

Two parts:

1. **Variables** — one `@variable` declaration per concept. Visibility
   is mandatory. See [§6](#6-variables-and-visibility).
2. **Invariants** — one per line, plain English, the constraints the
   runtime must hold at every State Commit (PRD-006 §14).

Optionally import a `hidden.md` to keep Hidden declarations separate.

### `entities.md` (optional)

Persistent entities (Player, Business, Staff, Customer) and Transient
entities (entities that live only for one phase). See [§7
Entities](#7-entities).

### `rules.md` (optional)

All automation. Organized into subsections:

- **Named formulas** (one `@formula` per derived quantity)
- **Action rules** (Guards and Transformations for each `@action`)
- **Time-based rules** (Trigger Rules for end-of-day, time passing, …)

See [§8 Rules](#8-rules).

### `events.md` (optional)

Two subsections, one per phase:

- **Pre Events** — fire before Simulation (set up environment)
- **Post Events** — fire after Simulation (react to results)

See [§9 Events](#9-events).

### `actions.md` (optional)

Two subsections:

- **Player actions** — one `@action` per choice
- **Auto actions** — `@auto-action` declarations for runtime-emitted
  triggers

See [§10 Actions](#10-actions).

### `ending.md`

Define how the game ends. PRD-008 §11 requires the runtime to **not**
end the game unless your package defines an ending. Sections:

- **Win** — primary victory condition
- **Lose** — primary defeat condition
- **Soft ending** — optional neutral end (e.g. survived but didn't
  reach the goal)
- **Hard ending** — optional forced end (e.g. time-out, catastrophic
  event)

See [§12 Ending](#12-ending).

### `ui.md`

Game-specific content for the dashboard. The LLM-runtime owns layout
(PRD-007). Your job is to list which variables and reports should
surface. Sections:

- **Dashboard content** — public variables on the main view
- **End-of-day summary content** — what the per-turn report shows
  (this is where Private variables surface)
- **Suppressed content** — Hidden variables the runtime must never
  render

See [§13 UI configuration](#13-ui-configuration).

### `start.md`

The opening of the game. Sections:

- **Initial state** — value of every public variable on turn 1
- **Opening narrative** — 1–3 sentences the runtime prints first
- **First event** — which Pre Event fires on turn 1
- **First action prompt** — which actions are available on turn 1

See [§14 Start scenario](#14-start-scenario).

---

## 6. Variables and visibility

Every concept in your game that has a value is a `@variable`. Three
visibilities (PRD-006 §16, PRD-003 §9a):

| Visibility | Where it surfaces                                              |
|------------|----------------------------------------------------------------|
| `Public`   | Always visible. Rendered on the dashboard, in summaries.      |
| `Private`  | Surfaces only in summaries (end-of-day, end-of-month).        |
| `Hidden`   | Never surfaces. Used for state the player must never see.     |

### Patterns

```markdown
@variable Money
Visibility: Public
Purpose:
Cash on hand, in whole currency units. Game ends if this drops
below zero.

@variable DailyRevenue
Visibility: Private
Purpose:
Revenue earned today. Surfaces in the end-of-day summary only.

@variable SupplyShortageChance
Visibility: Hidden
Purpose:
Whether today's supply chain is constrained. Set by a Pre Event
and read by a Transformation Rule.
```

### Common pitfalls

- **Forgetting `Visibility:`** — the validator warns and defaults to
  `Public`. Always declare it explicitly.
- **Putting Hidden variables on the dashboard** — the runtime is
  required to suppress them, but design defensively: don't write a
  UI block that lists your Hidden variables.
- **Reusing one variable for two concepts** — declare each concept
  separately. If `Reputation` and `CustomerSatisfaction` are different
  in your game, declare both.

---

## 7. Entities

Entities are named actors the runtime tracks. Two kinds (PRD-006 §5a,
PRD-008 §7):

| Kind        | Lifetime                                     | When to use                              |
|-------------|----------------------------------------------|------------------------------------------|
| `Persistent`| Survives across turns, lives in the snapshot | Player, Business, Staff, Customer, Item  |
| `Transient` | Exists for one phase only                    | Per-iteration state during Simulation   |

### Persistent entities

```markdown
@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Owns the Business and decides actions each turn.
Relationships:
Owns one Business; hires Staff.
```

- `Attributes` — comma-separated list of variables that "live on" this
  entity. Use this for documentation; the runtime does not enforce
  ownership automatically.
- `Behaviour` — natural language. Tells the runtime and any reader
  what the entity does.
- `Relationships` — natural language, similar.
- `Purpose` — recommended for documentation audits.

### Transient entities

```markdown
@entity Sale
Kind: Transient
Lifetime: Simulation Phase
Attributes:
Revenue, CostOfGoods
Behaviour:
Instantiated once per Customer served during Simulation, then
discarded when the phase ends.
```

`Lifetime:` is required for Transient entities. The runtime must
never include Transient entities in the Turn History or the snapshot.

### When to declare what

Most games declare `Player`, one or more core actors (`Business`,
`Stand`, `Crew`), and one Transient for the per-iteration unit of
simulation (`Cup`, `Sale`, `Hit`, `Shot`). If your game has no
entities that survive across turns (e.g. a single-action puzzle),
you can omit `entities.md` entirely.

---

## 8. Rules

Rules are the heart of your game. They are how state changes. Three
kinds (PRD-008 §15a.4, PRD-010, PRD-011):

| Kind             | Trigger | Precondition | Effect  | Use                                  |
|------------------|---------|--------------|---------|--------------------------------------|
| `Guard`          | ✓       | ✓            | ✗       | Block an action when a condition fails |
| `Transformation` | ✓       | ✓            | ✓       | Apply an action's effect             |
| `Trigger`        | ✓       | optional     | ✓       | Fire automatically on a phase/event  |

### The pair pattern

For each `@action`, you usually write one `Guard` and one
`Transformation` with the same `Trigger`. The Guard rejects; the
Transformation applies (PRD-011 §9). They run atomically: if the
Precondition fails at execution time (state changed between guard and
simulation), the Transformation is skipped whole.

```markdown
@rule CanBuyStock
Kind: Guard
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Purpose:
Block Buy Stock when the player cannot afford the total.
Failure:
Reject action; ApplyBuyStock does not fire.

@rule ApplyBuyStock
Kind: Transformation
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Effect:
Money -= Quantity * UnitCost
Stock += Quantity
Priority:
0
Purpose:
Perform the purchase atomically.
Failure:
If Precondition fails at execution time, rule is skipped; no state
change.
```

### Triggers

Trigger Rules fire on Event Phases (PRD-005 §7, §7a). They run after
Simulation, before Commit, or before Simulation, depending on Phase.

```markdown
@rule ChargeDailyCosts
Kind: Trigger
Trigger:
On Post Event
Effect:
Money -= DailyRent
Priority:
0
Purpose:
Charge rent at end of each day.

@rule RollCustomers
Kind: Trigger
Trigger:
On Pre Event
Effect:
Customers := Max(0, Round(CustomersToday))
Priority:
5
Purpose:
Compute today's customer count before Simulation reads it.
```

### Priority and conflict

When two Rules touch the same Variable in the same Phase, higher
`Priority:` runs first (PRD-010 §10, PRD-011 §10). Same Priority:

- additive ops (`+=`, `-=`): sum
- multiplicative ops (`*=`, `/=`): compose
- assignment (`:=`): requires an explicit winner — declare order in
  the section's `## Rule priority` trailer

### Documentation

Every Rule should declare `Purpose:` and `Failure:` (PRD-014). The
Purpose block is what the LLM reads to understand *why* the rule
exists. The Failure block tells it what to do when Precondition fails
(reject? skip? narrate?).

---

## 9. Events

Events are scheduled or triggered pieces of narrative. They run in
two distinct phases (PRD-005 §7, §7a):

- **Pre Event** — fires before Simulation. Sets up the turn's
  environment (weather, supply, market conditions, hidden rolls).
- **Post Event** — fires after Simulation, before Commit. Reacts to
  what just happened (festival bonus, customer complaint, audit).

```markdown
@event Weather Roll
Phase: Pre
Trigger:
Start of Day.
Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)
Purpose:
Roll today's weather before Simulation reads demand.

@event Festival
Phase: Post
Trigger:
Customers = 0 AND Reputation >= 40
Effect:
Reputation += Clamp(5, 0, 100 - Reputation)
Purpose:
Reward a sell-out day. Only fires when Reputation is 40+ so early
players don't feel arbitrarily punished.
```

### Event ordering

Within each phase, events run in declaration order unless `Priority:`
is set. Document the order in a `## Event ordering` block at the
bottom of `events.md` so the runtime and any reviewer can see your
intent (the Lemonade game does this; the compiler does not enforce
it).

### When to use Events vs Rules

- Use **Events** when the trigger is "start of day", "end of day", or
  a state-driven consequence.
- Use **Rules with Trigger** when you need `Precondition`, `Effect`,
  and `Priority` together as one unit (Pre Event setup, Post Event
  reaction).
- Use **Rules with Transformation** when the trigger is an `@action`.

---

## 10. Actions

Actions are the player's surface. They declare only *what the player
intends*, not what happens. Effects live in Rules.

```markdown
@action Buy Stock
Intent:
buy stock
purchase stock
restock
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * UnitCost
Purpose:
Let the player convert Money into Stock inventory.
Failure:
Reject when funds are insufficient; state does not change.
```

- `Intent:` — one or more natural-language phrasings. The runtime
  matches player input to intents.
- `Parameters:` — typed parameter list. Use the form `Name: Type`.
- `Preconditions:` — boolean guard. Same expression syntax as
  `@formula` bodies.
- `Purpose:` — required for documentation (PRD-014).
- `Failure:` — recommended. What the runtime narrates when the
  action is rejected.

### Auto actions

Some actions are emitted by the runtime, not the player. Declare
them with `@auto-action` and a `Fires When:` condition:

```markdown
@auto-action End Day
Fires When:
Stock = 0 OR Customers = 0 OR Day >= MaxDay
Purpose:
Close the day once the business can no longer sell.
```

The runtime triggers the named Auto-Action when the condition
becomes true. Auto-actions commonly end turns, end games, or trigger
phase transitions.

---

## 11. Formulas

Formulas are reusable expressions. They resolve at Build time
(PRD-009 §14). The body must be an expression — never prose
(PRD-009 §18a).

### Single line

```markdown
@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Baseline customers before modifiers.
```

### Piecewise

```markdown
@formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 1.5
Otherwise                 Then 1.0
Purpose:
Multiplicative demand modifier.
```

### Reference

A formula body can be just another formula's name:

```markdown
@formula CustomersToday
BaseDemand * WeatherModifier - Price * 0.05
Purpose:
Final customer count for the day.
```

### Common functions

`Max(a, b)`, `Min(a, b)`, `Clamp(x, lo, hi)`, `Round(x)`,
`Floor(x)`, `Ceil(x)`, `Abs(x)`, `Weighted(...)`, `Uniform(lo, hi)`,
`Round(...)`. See PRD-009 for the canonical list and `gaps.md` in the
reference games for things still being designed (e.g. String
containment in Hangman GAP-010).

---

## 12. Ending

The runtime does **not** end the game unless your package defines
an ending (PRD-008 §11). Four sections, all optional but you should
at least define Win and Lose:

```markdown
## Win

At the end of Day 30:
Money >= 2000 AND Reputation >= 70 → Player wins.

## Lose

At any State Commit:
Money < 0 → Player loses. Game ends immediately.

## Soft ending

At the end of Day 30:
0 <= Money < WinThreshold → Neutral ending.

## Hard ending

None for this game.
```

Common patterns:

- **Win at end of last day** — most tycoons, sims, RPGs.
- **Lose on condition** — bankruptcy, death, time-out.
- **Soft ending** — survived but underperformed (tycoon games often
  have C/B/A/S tiers).
- **Hard ending** — forced game-over (war, extinction, catastrophe).

---

## 13. UI configuration

You declare *content*; the LLM-runtime owns *layout* (PRD-007,
PRD-008 §12). Three subsections:

```markdown
## Dashboard content

Day (of MaxDay)
Money
Reputation
Stock
Price (if set)

## End-of-day summary content

Customers served
Units sold
Revenue
Costs (rent, salaries, spoilage)
Reputation change
Event(s) fired

## Suppressed content

Weather, SupplyShortageChance, and any other Hidden variable from
state.md MUST NOT appear in any UI surface.
```

### Tips

- **Dashboard** lists public variables in the order you want them
  shown. The runtime renders them.
- **Summary** lists per-turn report fields. This is where Private
  variables surface.
- **Suppressed** lists every Hidden variable and asserts it must
  never render. The runtime enforces this, but the assertion helps
  reviewers spot leaks.

---

## 14. Start scenario

What the player sees on turn 1. Four subsections:

```markdown
## Initial state

Money = 500
Day = 1
Reputation = 50
Stock = 0
Price = 0 (unset)

## Opening narrative

You are the new owner of a small business. The doors open tomorrow.
What will you do first?

## First event

Weather Roll (see events.md).

## First action prompt

Buy Stock, Set Price, Start Selling.
```

`Initial state` lists every public variable and its starting value.
`Opening narrative` is 1–3 sentences. `First event` names the Pre
Event that fires on turn 1 (or "None"). `First action prompt` lists
the actions the player can take first.

---

## 15. Naming conventions

Names follow Title-Case with single spaces (PRD-008 §15a, validation
`DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME`):

- **Single word**: `Money`, `Day`, `Cup`
- **Multiple words, single space**: `Buy Stock`, `Sell One Cup`,
  `Auto Action End Day`, `Weather Roll`, `Heat Wave`

Forbidden:

- Multiple spaces (`Buy  Stock`)
- Trailing/leading spaces
- All lowercase (`moneystock`)
- Snake-case or kebab-case (`Buy_Stock`, `Buy-Stock`)
- Pure digits or starting with a digit (`3Day`)

Section ids are kebab-friendly: `intro`, `rules`, `state-contract`,
`output-contract`. The id may contain letters, digits, dashes,
underscores, dots.

---

## 16. Validation and common errors

Run `mgr validate` after every meaningful edit. The compiler emits
structured errors with file, line, directive, and suggestion
(PRD-001 §13, `src/errors/`). The error codes you'll hit most
often:

| Code                                  | Cause                                              | Fix                                              |
|---------------------------------------|----------------------------------------------------|--------------------------------------------------|
| `DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME` | Wrong name format                            | Use Title-Case, single spaces                    |
| `SECTION_SCHEMA_MISSING_BLOCK`        | Required block missing on a declaration            | Add the block the validator named                |
| `SECTION_SCHEMA_FORBIDDEN_BLOCK`      | Block present on a kind that forbids it            | Remove `Effect:` from a Guard, etc.              |
| `SECTION_SCHEMA_MISSING_KIND`         | `Kind:` block missing                              | Add `Kind: Guard / Transformation / Trigger`     |
| `SECTION_SCHEMA_DUPLICATE_BLOCK`      | Same block declared twice on one declaration       | Merge the two blocks                             |
| `SECTION_SCHEMA_UNKNOWN_BLOCK`        | Block name not in the schema                       | Check spelling or move to `Behaviour:`           |
| `DOCUMENTATION_PURPOSE_MISSING`       | Declaration has no `Purpose:` block                | Add 1–3 sentences explaining intent              |
| `DOCUMENTATION_BLOCK_EMPTY`           | Block declared but empty                          | Fill it or remove the heading                    |
| `UNKNOWN_DIRECTIVE`                   | Directive name not in the registry                 | Check spelling; the compiler suggests a did-you-mean |
| `IMPORT_NOT_FOUND`                    | `@import` target missing                           | Check path; remember `/` prefix anchors at srcDir |
| `IMPORT_OUTSIDE_SRC`                  | `@import` resolves outside srcDir                  | Use a relative path or `/`                       |
| `DUPLICATE_SECTION`                   | Two `@section` with same id                        | Rename one of them                               |
| `DEPENDENCY_CYCLE`                    | `@import` cycle                                    | Break the cycle                                  |
| `FORMULA_BODY_INVALID`                | Formula body looks like prose                      | Use single-line, piecewise, or a formula reference |

Errors are localized in English and Vietnamese via `--lang`. The
default language follows `MGR_LANG` → `LANG` → `en`.

---

## 17. Recommended writing workflow

You can write sections in any order, but this sequence produces the
fewest round-trips:

1. **`metadata.md`** — name, author, description, runtime, version.
   Lock these in early; they show up in every build artifact.
2. **`world.md`** — pick a Time scale (turn = day / action / week) and
   an Economy (currency, supply rules).
3. **`state.md`** — declare your variables (Public / Private / Hidden)
   and invariants. Resist adding more variables later.
4. **`entities.md`** — declare persistent actors and any transient
   per-iteration units.
5. **`start.md`** — set initial values and write the opening
   narrative. Now the game has a turn 0.
6. **`actions.md` + `rules.md` together** — for each player action,
   write its `CanX` Guard and `ApplyX` Transformation together. Add
   the formula each one depends on first.
7. **`events.md`** — Pre Events that set up each turn, Post Events
   that react to outcomes.
8. **`ending.md`** — at minimum, Win and Lose. Add Soft / Hard if
   your game supports them.
9. **`ui.md`** — what shows on the dashboard, what shows in summaries,
   what must stay hidden.

Run `mgr validate` after each section. The compiler catches schema
errors, missing blocks, and typos. You can run it on partial projects;
the bundler only complains if there's nothing to bundle.

When you have a buildable bundle, the real test is reading it. Run
`mgr build` and skim `dist/<name>-<version>.md`. If a section looks
ambiguous, rewrite the source. The bundle is what the LLM reads —
it is the user interface of your game.

---

## 18. Reference games and templates

Three places to copy from:

- **`templates/blank/`** — the minimum scaffold. Use it to start a
  game that doesn't fit any known genre.
- **`templates/business-sim/`** — full 11-section skeleton for
  shopkeeping / tycoon / supply-chain games, with example
  `@variable`, `@rule`, `@event` declarations.
- **`tests/reference-games/lemonade/`** — the canonical working
  example. A 20-day lemonade-stand simulation that exercises every
  PRD section. Read `lemonade/gaps.md` first — it lists the open
  questions the game exposes about the runtime.
- **`tests/reference-games/hangman/`** — a second working example in
  a different genre (word guessing). Use it to see how games with
  String variables and `in` operators are written.

The compiler does not enforce any specific game genre. The
`sections` are a convention; the canonical Lemonade layout is the
recommendation, not a requirement. If your game needs a `combat.md`
section or a `dialogue.md` section, declare it and import it from
`main.md` — the compiler will bundle it where it falls.

For the formal schema reference, see PRD-008 §15a (Section Schema).
For documentation requirements (Purpose, Failure), see PRD-014.

---

*Happy writing. Watch the spoilage.*
