# Gaps — Hangman Reference Game

Reference Game #2. Uses the Gap Detection Protocol from
`tests/reference-games/README.md`.

Every decision in `src/*.md` must cite a PRD. When no PRD covers the
decision, log it here and mark it `TODO(gap)` in the source.

---

## Status

- [x] Author has walked all 11 GPS sections for Hangman
- [x] Section Schema (§15a) enforced on every declaration
- [x] Documentation Schema (§14) — Purpose on every Rule / Action / Event
- [x] Gaps triaged into PRD candidates below

---

## Gaps

### GAP-010 — String containment operator missing from Formula grammar  🔴 OPEN

**File:** `src/rules.md`
**PRDs consulted:** PRD-009 §6-§8 (Arithmetic / Comparison / Boolean),
PRD-009 §14 (Named Formulas)
**Category:** formula

**What I needed to decide:**
`CanGuessLetter` needs to reject a Letter that already appeared in
GuessedLetters. `ApplyLetterCorrect` needs to reveal a Letter in Mask
when the Letter appears in Word. Both require a String containment
operator — `Letter in GuessedLetters`, `Letter in Word` — but PRD-009
has no such operator.

**What the PRDs say:**
PRD-009 §7 defines `=`, `≠`, `<`, `>`, `≤`, `≥`. None applies to
substring or character-in-string checks. §12 has `Sum`, `Count`,
`Average` on Collections but not string operations.

**What I did instead:**
Wrote `Letter in Word` in Preconditions as if it were a legal
expression, plus `Reveal(Mask, Word, Letter)` and
`Append(GuessedLetters, Letter)` as if they were String helpers.
Runtime will have to interpret these correctly.

**Proposed resolution:**
Amend PRD-009 v1.1 → v1.2 with `§8a String Operators`:

- `X in Y` — Boolean, true iff String X is a substring of String Y.
- `Length(X)` — Integer, character count of String X.
- `Append(X, Y)` — String, concatenation with a comma separator (for
  GuessedLetters-style stores). Or a dedicated `AppendCsv(...)`.
- `Reveal(Mask, Word, Letter)` — String, positions of Letter in Word
  copied into Mask, other positions preserved.
- `Case(X, upper|lower)` — String, case fold.

Or narrower: a `String` sub-grammar as a PRD-016 that PRD-009 §5 defers
to.

**Resolution:** (not yet closed)

---

### GAP-011 — Visibility transition (Hidden → Public at ending)  🟡 OPEN

**File:** `src/state.md`, `src/rules.md::CheckWin`, `CheckLose`, `ApplyGiveUp`
**PRDs consulted:** PRD-006 v1.1 §11a Visibility Declaration
**Category:** state

**What I needed to decide:**
`Word` is Hidden throughout gameplay. When the game ends (win, lose,
give up), the player must see the Word. But `Visibility` in PRD-006
§11a is declared once per Variable — there is no transition.

**What the PRDs say:**
PRD-006 §11a: Variables declare Visibility statically. §16 lists three
levels but they are permanent. No mechanism for revealing a Hidden
variable at a state milestone.

**What I did instead:**
Kept `Word` Hidden and instead assigned `Mask := Word` in CheckWin,
CheckLose, and ApplyGiveUp. Since Mask is Public, the player sees the
Word through Mask when the game ends. Works, but conflates two
concepts (display pattern vs the truth) into one variable.

**Proposed resolution:**
Amend PRD-006 v1.1 → v1.2 §11b Visibility Transition:

- Declaration: `On <Condition> Reveal <Variable>`.
- Runtime lifts the Variable from Hidden to Public when Condition
  becomes true; the transition is one-way.
- Turn History records the transition so replay is deterministic.

**Resolution:** (not yet closed)

---

### GAP-012 — Ambiguous single-character input  🟢 CLOSED-BY-CONVENTION

**File:** `src/actions.md`
**PRDs consulted:** PRD-012 §5 (Intent Phrases), §7 (Extraction),
§8 (Ambiguity), §11 (Passthrough)
**Category:** runtime

**What I needed to decide:**
Player types `a`. Is that Guess Letter with Letter="a" or Guess Word
with WordGuess="a"?

**What the PRDs say:**
PRD-012 §8 says ambiguity must be surfaced to the player. §11
Passthrough grabs free text after Intent phrases. §13 orders match
attempts by Action declaration order.

**What I did instead:**
Ordered `Action Guess Letter` before `Action Guess Word` in
actions.md and set Guess Letter's `Letter: String` parameter to accept
only a single character. Guess Word's `WordGuess: String` accepts
2+ characters. Single-character input hits Guess Letter; longer input
falls through to Guess Word.

**Proposed resolution:**
Existing PRD-012 §11 Passthrough already supports this pattern with
Author-supplied `Match:` regex or length constraint. This gap is
closed by convention — no PRD amendment needed, just discipline in
Action ordering.

However, PRD-012 §7 could be tightened: "Parameter constraints
(min-length, max-length, regex) participate in disambiguation" to
formalize what this game relies on.

**Resolution:** conventional; PRD-012 §7 could be tightened for
clarity but not required.

---

## Triage summary

| Gap | Status | Resolution |
| --- | --- | --- |
| GAP-010 | 🔴 OPEN   | PRD-009 v1.2 §8a String Operators |
| GAP-011 | 🟡 OPEN   | PRD-006 v1.2 §11b Visibility Transition |
| GAP-012 | 🟢 CLOSED | Convention (Passthrough + length) |

**Code impact of Hangman:**
- New reference game `tests/reference-games/hangman/` — 12 files.
- Compiles cleanly against current Kernel (PRD-008 v1.2 + PRD-014 +
  Documentation Schema Validator).
- Every Rule / Action / Event carries a Purpose block.
- Every Guard + Transformation + Action that can reject input carries
  a Failure block.

**Next step:**
- Close GAP-010 (String Operators) → PRD-009 v1.2 amendment.
- Close GAP-011 (Visibility Transition) → PRD-006 v1.2 amendment.
- Reference Game #3 (Business Mini) to stress PRD-013 Query &
  Selector with real Collections.
