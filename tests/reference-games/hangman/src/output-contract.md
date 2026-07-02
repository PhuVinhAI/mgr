@section output-contract

<!-- Per-game Output Contract. The MGR default five-part response
     envelope (Narrative / Effects / Updated State / Available
     Actions / Await) is shaped for tycoon-style games. Hangman's
     response is a single line of verdict plus the puzzle surface —
     no separate "narrative" section is useful. Runtime-level
     invariants (response follows commit, response never mutates
     state, at least one available action per turn) still hold via
     the runtime layer. -->

Every response is composed of exactly these parts, in order:

1. Verdict — one line, the result of the guess just resolved. One
   of: "Correct." / "Wrong." / "You've already tried that letter." /
   "Not a valid guess: <reason>." / "You win!" / "You lose." /
   "You gave up." / "New puzzle." (turn 1 only).
2. Word — the current Mask, rendered per the UI Contract.
3. Progress — the two-line `Wrong` + `Tried` block.
4. Prompt — a single line inviting the next guess, or, at GameOver,
   inviting a new game.

Suppressed parts.
The default "Game Effects", "Updated State", and "Available Actions"
sections are omitted:
- Effects are encoded in the Verdict line — no separate ledger.
- Updated State is fully rendered by the Word + Progress slots.
- Available Actions is a fixed set (guess letter, guess word, give
  up) that never changes turn to turn; enumerating it every response
  is noise. The Prompt names the three options once and stops.

Available actions still exist even when not listed.
The Prompt sentence guarantees the player always has a valid next
move — "guess a letter, a whole word, or give up". At GameOver, the
Prompt offers a new game. There is never a turn where the player
has no legal input.

Response after failed validation.
If the guess is rejected (empty input, non-letter, already tried, or
GameOver), the Verdict slot carries the reason, and Word / Progress
render the unchanged state. No retraction narrative, no partial
update.

Response after commit.
The response is generated after State Commit; it never mutates
state. If a Rule fires ApplyLetterCorrect and CheckWin in the same
turn, the response reflects the post-CheckWin values (Mask = Word,
Won = true, GameOver = true) — never a pre-commit intermediate.
