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
- [x] Round 1 gaps triaged into PRD amendments and new PRDs
- [x] Round 1: Lemonade rewritten to use the resolved syntax
- [x] Round 1: Compiler + tests updated to enforce the new surface
- [x] Round 2 gaps identified (execution model, action resolution, query, RFC-style)
- [x] Round 2 gaps triaged into 3 new PRDs (011/012/013) + PRD-008 amendment
- [x] Round 2: Lemonade rewritten to RFC-style Section Schema
- [x] Round 2: Compiler + validator + tests updated (74/74 passing)
- [x] Round 3 gaps identified (documentation schema, Formula body prose)
- [x] Round 3: PRD-014 new + PRD-008 v1.2 + PRD-009 v1.1 amendments
- [x] Round 3: Lemonade Purpose/Failure blocks + Hangman built (84/84 passing)

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

## Round 1 triage summary

All 5 Round 1 gaps closed by 2 new PRDs + 3 amendments:

| Gap | Resolution |
| --- | --- |
| GAP-001 | PRD-006 v1.1 §11a + PRD-003 v1.1 §9a |
| GAP-002 | PRD-006 v1.1 §5a |
| GAP-003 | **PRD-009 (new)** — Formula System |
| GAP-004 | PRD-005 v1.1 §7 + §7a |
| GAP-005 | **PRD-010 (new)** — Rule Language |

**Round 1 code impact:**
- `RUNTIME_SPEC_VERSION` bumped 1.3 → 1.4 (turn-loop + state-contract).
- `PSF_SPEC_VERSION` bumped 1.0 → 1.1 (visibility preservation).
- 17 new directive names reserved for future syntax (PRD-005/006/009/010).
- 3 runtime tests updated + 2 new tests added; 61/61 passing.

---

## Round 2 gaps

After Round 1, a re-read of the rewritten Lemonade exposed a second
layer of missing kernel semantics — not "how to write" (Round 1
closed that) but "how to execute" and "how to enforce structure".

### GAP-006 — Rule Execution Model  ✅ CLOSED

**File:** `src/rules.md`
**PRDs consulted:** PRD-010 §9, §10 (Rule Language)
**Category:** rule

**What I needed to decide:**
`SellOneCup` mutates 5 variables in one Effect block. What is the
execution order? Are all 5 atomic? If `Ice -= IcePerCup` violates
`Ice >= 0`, do the first two mutations still commit? When Rule A
and Rule B both mutate `Money` in the same Phase, who wins?
`Priority` alone does not answer conflict policy for `:=` vs `+=`
vs `×=`.

**What the PRDs said:**
PRD-010 §9 said Effects were "atomic" but did not define atomicity
or rollback. §10 said "higher Priority runs first" but did not
define what happens on ties, or how additive/multiplicative
modifiers compose, or whether Rules read the Turn-Start snapshot or
intermediate state.

**Resolution:**
- **PRD-011 Rule Execution Model** (new) — 20 sections covering the
  Match → Sort → Prepare → Apply → Verify → Commit pipeline, Turn
  Start Snapshot semantics, atomic-per-Rule, invariant rollback,
  Conflict Policy per operator, Modifier Layering, forbidden
  read-after-write.
- Runtime `turn-loop` body (v1.5) — "Rule execution within a phase"
  paragraph teaches the LLM the model in prose.
- `rules.md` extended with explicit `Priority:` blocks and a
  higher-Priority `ApplyShortage` Rule that demonstrates modifier
  layering.

---

### GAP-007 — Action Resolution  ✅ CLOSED

**File:** `src/actions.md`
**PRDs consulted:** PRD-008 §10, PRD-005 §5
**Category:** runtime

**What I needed to decide:**
When Player types "buy 20 lemons", how does Runtime pick the Action
`Buy Lemons` and extract `Quantity = 20`? What if they type just
"buy" — ambiguous between Lemons/Sugar/Ice? What if they type
"help"? PRD-008 §10 said "Runtime maps free text to a valid Action
or rejects" but did not say how.

**What the PRDs said:**
Nothing. `INPUT_UNRESOLVED` was a phrase in PRD-005 §5 without a
resolution algorithm attached.

**Resolution:**
- **PRD-012 Action Resolution** (new) — 20 sections covering
  Normalize → Match Intent → Extract Params, Ambiguity handling,
  Reserved Intents (help/quit/retry), Auto Actions, Passthrough
  parameters.
- Runtime `turn-loop` body (v1.5) — Input Phase description adds
  "intent matching before validation begins; reserved intents always
  win over game actions".
- `actions.md` rewritten with explicit `Action <Name>` + `Intent:` +
  `Parameters:` + `Preconditions:` blocks. `End Day` moved to
  `Auto Action` with a `Fires When:` guard.

---

### GAP-008 — Query & Selector  ✅ CLOSED

**File:** future games (not stressed by Lemonade)
**PRDs consulted:** PRD-006 §7 (Collection), PRD-009 §12 (Aggregation)
**Category:** state

**What I needed to decide:**
Once games grow past scalar variables (Game Dev Tycoon has hundreds
of Employees, Projects, Reviews), Rules need to filter / project /
aggregate Collections. PRD-006 §7 said Collections exist. PRD-009
§12 had `Sum` / `Count` / `Average` but no filter, no ordering, no
quantifiers (`Any` / `All`), no First/Last.

**What the PRDs said:**
Almost nothing. Rules would have to describe queries in free English.

**Resolution:**
- **PRD-013 Query & Selector System** (new) — 20 sections covering
  `Source where Predicate select Projection order by Key limit N`,
  aggregation, quantifiers, First/Last, Named Queries.
- Runtime `state-contract` body (v1.5) — new "Queries and selectors"
  paragraph so the LLM knows selectors are pure and snapshot-scoped.
- Not applied to Lemonade (no Collection stress). Waiting for
  Reference Game #3 (Business Mini) to prove it end-to-end.

---

### GAP-009 — Section Schema (RFC-style refactor)  ✅ CLOSED

**File:** all Game Package files
**PRDs consulted:** PRD-008 §8/§9/§10, PRD-010 §5, PRD-012 §4
**Category:** package

**What I needed to decide:**
PRD-010 defined block-form Rule syntax. PRD-012 did the same for
Action. PRD-006 §11a did the same for Variable. But GPS (PRD-008)
did not **enforce** that every declaration follow its schema. Games
could mix free prose ("Buy Lemons: the player…") with machine-
readable declarations. LLM had to guess structure per Turn.

**What the PRDs said:**
Nothing at Package level. Individual PRDs specified their own kind
but the enforcement gap left GPS silent.

**Resolution:**
- **PRD-008 v1.1 §15a Section Schema** — consolidates schema-per-
  kind for Variable / Entity / Formula / Rule / Event / Action /
  Query. Required and forbidden blocks per Kind. §15a.9 splits
  docs-only files from build-included files. §15a.10 defines error
  codes.
- **Section Schema Validator** (`src/validator/schema.ts`) — line
  scanner + block registry with alias handling and multi-line HTML
  comment awareness. Wired into `validate(graph)` pass.
- 5 new i18n error codes added to `en.ts` + `vi.ts`.
- Lemonade rewritten fully to RFC-style: every Rule, Action, Event,
  Entity, Variable declares its blocks explicitly. Build passes.

---

## Round 2 triage summary

| Gap | Resolution |
| --- | --- |
| GAP-006 | **PRD-011 (new)** — Rule Execution Model |
| GAP-007 | **PRD-012 (new)** — Action Resolution |
| GAP-008 | **PRD-013 (new)** — Query & Selector |
| GAP-009 | PRD-008 v1.1 §15a + Section Schema Validator |

**Round 2 code impact:**
- `RUNTIME_SPEC_VERSION` bumped 1.4 → 1.5 (turn-loop rule execution +
  input resolution paragraphs; state-contract queries paragraph).
- 33 new directive names reserved for future syntax
  (PRD-008 §15a + PRD-011 + PRD-012 + PRD-013).
- New `src/validator/schema.ts` (line-scan + per-kind schema).
- 5 new error codes added to i18n catalog (en + vi).
- New `test/section-schema.test.ts` with 12 tests covering the
  validator surface.
- Registry test extended for the 33 new reserved names.
- Runtime test bumped to v1.5 + PRD-011/012/013 body assertions.
- Total: 74/74 tests passing.

---

## Round 3 gaps

Round 2 shipped a machine-parsable Kernel. Reading the Lemonade v2
output showed one axis was still missing: **why each declaration
exists**. The output had structure, but no motivation — a Rule and its
neighbour looked identical unless you inferred intent from the name.

### GAP-013 — Documentation Schema  ✅ CLOSED

**File:** all Lemonade `src/*.md` (v2)
**PRDs consulted:** PRD-008 §15a (only execution-shape blocks),
PRD-014 (new)
**Category:** package

**What I needed to decide:**
When a Rule / Action / Event exists, how does the LLM know **why**?
The v2 files declared execution shape correctly, but a Rule like
`ApplyBuyLemons` gave no reason for its existence beyond the name.
Rule chains with modifier layering (`ApplyShortage`, `RollCustomers`)
became opaque quickly.

**What the PRDs said:**
PRD-008 §15a only defined execution blocks (`Kind`, `Trigger`,
`Precondition`, `Effect`, `Priority`, ...). Nothing enforced
documentation.

**Resolution:**
- **PRD-014 Documentation Schema** (new) — Purpose / Failure / Notes /
  Examples blocks. Purpose is ERROR-level on Rule/Action/Event.
  Failure is WARNING-level on Rule Transformation/Guard/Action.
- PRD-008 v1.1 → v1.2 §15a.11 — documentation blocks added to §15a
  block catalog.
- Validator extended with per-kind Purpose/Failure checks; warnings
  channel wired into ValidateResult.
- 5 new error codes.
- Lemonade v3: every Rule / Action / Event carries Purpose; every
  Guard / Transformation / Action carries Failure.

---

### GAP-014 — Formula body could still be prose  ✅ CLOSED

**File:** any `Formula X` body without operators
**PRDs consulted:** PRD-009 §3-§14
**Category:** formula

**What I needed to decide:**
PRD-009 defined Formula as an expression tree, but the validator did
not enforce that authors write body as an expression. A prose sentence
in a Formula body would silently ship into the Prompt Specification.

**What the PRDs said:**
Nothing enforced. Grammar was implicit.

**Resolution:**
- PRD-009 v1.0 → v1.1 §18a — Formula body must be a single
  expression, Piecewise, Named reference, or Bounded expression.
- Validator adds heuristic prose detection; emits
  `FORMULA_BODY_INVALID` at WARNING level.
- Lemonade v3 tightened Formula bodies (already expression-only).

---

## Round 3 triage summary

| Gap | Resolution |
| --- | --- |
| GAP-013 | **PRD-014 (new)** + PRD-008 v1.2 §15a.11 |
| GAP-014 | PRD-009 v1.1 §18a + Formula body validator |

**Round 3 code impact:**
- `RUNTIME_SPEC_VERSION` bumped 1.5 → 1.6 (state-machine gains a
  short "Rule documentation" paragraph).
- 4 new reserved directive names (purpose, failure, notes, examples).
- Validator schema.ts refactored: emit into errors + warnings arrays,
  Documentation Schema pass added, Formula body prose heuristic added.
- 5 new error codes; 84 tests passing.
- Lemonade rewritten to include Purpose on every Rule / Action /
  Event, Failure on every Guard / Transformation / Action.

**Next step:**
Reference Game #2 — Hangman — now exists at
`tests/reference-games/hangman/`. It exposed 3 new gaps (see
`hangman/gaps.md`):

- GAP-010 String containment operator (`Letter in Word`).
- GAP-011 Visibility transition (Hidden → Public at ending).
- GAP-012 Ambiguous single-character input (closed by convention).

Follow-up candidates: PRD-009 v1.2 §8a String Operators (closes
GAP-010), PRD-006 v1.2 §11b Visibility Transition (closes GAP-011),
Reference Game #3 (Business Mini) for PRD-013 Query.

---

## Round 4 gaps

After Round 3 the Kernel shipped a machine-parsable authoring surface.
The only directives the parser actually recognised were still
`@import` and `@section`; every §15a declaration was prose text the
Section Schema validator scanned with regex. That worked, but it made
the parser a dispatcher for two directives and a validator that did
most of the real structural work. Round 4 promotes the §15a shapes
to first-class directives so the parser is the source of truth.

### GAP-015 — §15a declarations were prose, not directives  ✅ CLOSED

**File:** `src/state.md`, `src/entities.md`, `src/rules.md`,
`src/events.md`, `src/actions.md`, `src/hidden.md`
**PRDs consulted:** PRD-008 §15a (Section Schema), PRD-002 §14
(Directive Registry)
**Category:** package

**What I needed to decide:**
`Variable Money`, `Entity Player`, `Rule CanBuyLemons`,
`Action Buy Lemons` were written as markdown lines and matched by a
regex in the Section Schema validator. The parser only knew
`@import` and `@section`. Adding a new declaration kind required
updating the validator regex, the i18n catalog, and the Reserved
list — but the parser never saw the declaration at all.

**What the PRDs said:**
PRD-002 §14 says the parser is directive-agnostic and new directives
register via the registry; PRD-008 §15a lists the eight canonical
declaration kinds but does not bind them to directive names.

**Resolution:**
- **AST** — new `BlockDeclarationNode` (`type: "declaration"`,
  `kind`, `name`, `body`, `bodyLines`) joins the existing leaf
  directives and MarkdownBlockNode.
- **Parser** — tracks an open block declaration; consumes subsequent
  non-directive, non-heading lines as the body. Body terminates at
  the next `@`-directive, a heading, or end-of-section. Blank lines
  are kept inside the body so authors can separate field paragraphs.
- **Directive registry** — Foundation now ships ten directives:
  `@import`, `@section`, `@variable`, `@entity`, `@formula`, `@rule`,
  `@event`, `@action`, `@auto-action`, `@query`. Each block handler
  validates a Title-Case multi-word name (`Auto Action End Day`).
- **Bundler** — `renderDeclarationBlock` emits
  `<Display Kind> <Name>\n<body>` so the Section Schema validator's
  prose-header scanner keeps matching; PSF §16 Prompt Purity still
  strips the `@` from the rendered output.
- **Validator** — `scanBlockDeclaration` runs alongside the legacy
  `scanProseMarkdown` so existing markdown-only sources still build.
  HTML comment tracking is shared between the two scanners.
- **I18n** — two new error codes (`DIRECTIVE_SYNTAX_DECLARATION_MISSING_NAME`,
  `DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME`) plus en + vi entries.
- **Tests** — 18 new tests in `test/block-declarations.test.ts`,
  2 existing tests in `test/registry.test.ts` updated to reflect the
  new registry contents. Total: 111 tests passing.

**Round 4 code impact:**
- `src/parser/ast.ts` — added `BlockDeclarationKind`, `BlockDeclarationNode`,
  flat `declarations` list on `MgrDocument`.
- `src/parser/index.ts` — block-mode state machine; `closeDeclaration`
  trims trailing blank lines and records per-line locations for
  validator error reporting.
- `src/parser/directives.ts` — 8 new handlers via `makeBlockHandler`;
  updated `DirectiveHandler` return type to include
  `BlockDeclarationNode`; added
  `DIRECTIVE_SYNTAX_DECLARATION_MISSING_NAME` and
  `DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME` keys.
- `src/bundler/index.ts` — `renderDeclarationBlock` + `displayKind`
  helpers; the PSF envelope now mixes `Section -> BlockDeclarationNode`
  children with prose.
- `src/validator/schema.ts` — `scanBlockDeclaration` mirrors the
  prose scanner with HTML comment tracking; shared `Declaration`
  struct + `emitForDeclaration` reducer.
- `src/i18n/{en,vi}.ts` + `src/i18n/types.ts` — two new catalog
  entries.
- `src/errors/index.ts` — two new `MgrErrorCode` members.

**Game impact:**
- Lemonade rewritten to use `@variable`, `@entity`, `@formula`,
  `@rule`, `@event`, `@action`, `@auto-action`. Hidden state is a
  separate `@section hidden-state` file with its own `@variable`s.
- Hangman rewritten to use `@variable`, `@entity`, `@rule`,
  `@action`. No events needed (Trigger rules cover end conditions);
  no auto-action needed.
- Both compile cleanly with the upgraded kernel; lemonade emits 18
  `DOCUMENTATION_PURPOSE_MISSING` warnings on Variables + Entities
  that lack a `Purpose:` block (WARNING level per PRD-014 §4), and
  hangman builds clean (0 errors / 0 warnings).

**Next step:**
- PRD-009 v1.2 §8a String Operators (still needed to close
  hangman GAP-010).
- PRD-006 v1.2 §11b Visibility Transition (still needed to close
  hangman GAP-011).
- Reference Game #3 (Business Mini) to stress PRD-013 Query with
  Collections end-to-end.
- Future PRD amendment: bind §15a directive kinds to
  reserved-name slots so `guard`, `trigger`, etc. (still reserved)
  migrate cleanly when their PRDs land.
