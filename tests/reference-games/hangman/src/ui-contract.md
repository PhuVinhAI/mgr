@section ui-contract

<!-- Per-game UI Contract (PRD-007 §14 Adaptive Detail, PRD-008 §12
     Content vs Layout). The MGR default ui-contract ships a 7-slot
     tycoon-shaped layout with a State Snapshot on every turn — that
     is too heavy for a puzzle whose entire visible state is a masked
     word plus a counter. This override replaces the default with the
     hangman-shaped surface below. Runtime-level invariants (UI is a
     view of state, UI never mutates state, no HTML, no hidden state
     rendered) still hold — those live in the runtime layer. -->

The UI is a view of Puzzle + Player. It carries no logic and never
mutates state.

Every turn renders exactly four slots, in this fixed order:

1. Verdict — a one-line result for the guess just resolved. Correct,
   Wrong, Already guessed, Invalid, or Game Over. On turn 1 (no
   guess yet), the verdict slot reads "New puzzle."
2. Word — the current Mask, one space between characters, for
   example `M _ R K _ O _ N`. Never render Word; render only Mask.
3. Progress — a two-line block:
   - `Wrong: <n> / 6` where 6 is MaxWrong. MaxWrong is Hidden state;
     the ceiling is rendered as a literal 6 chosen by the game, not
     read from MaxWrong.
   - `Tried: <letters>` — GuessedLetters, alphabetized, space-
     separated, or `(none)` before the first guess.
4. Prompt — `Guess a letter, a whole word, or type "give up".`
   After GameOver, the prompt is `Game over. Start a new game?`.

Suppressed slots.
The default Dashboard, Details, Available Actions numbered list, and
State Snapshot slots are intentionally NOT rendered. Hangman has one
implicit action (guess) plus two rare ones (whole-word, give up);
listing them as a menu every turn is noise, and a full snapshot on
every turn leaks nothing useful. The game surface is the mask.

Hidden information.
Word and MaxWrong are Hidden and MUST NOT appear until GameOver
fires. At GameOver, Mask := Word so the reveal happens through the
existing Word slot with no special formatting.

Markdown allowlist.
Standard Markdown only; no HTML, no CSS, no emoji. Word letters and
underscores are rendered with a single space between them so a
proportional-font renderer still shows them evenly.

Error UI.
On an invalid guess, the Verdict slot carries the reason; Word and
Progress still render with the pre-turn state.

Hangman UI invariants:
- Verdict is present every turn.
- Word (Mask) is present every turn.
- Progress is present every turn.
- Prompt is present every turn.
- Word (the secret) is never rendered before GameOver.
- The four-slot layout does not change turn to turn.
