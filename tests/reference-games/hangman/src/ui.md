@section ui

<!-- PRD-008 §12 UI Configuration — Game specifies content only; Layout
     comes from PRD-007 UI Contract. -->

## Dashboard content

Mask
GuessedLetters
WrongGuesses (of MaxWrong)
Turn

## End-of-turn summary content

Last guess
Result — Correct / Incorrect / Whole word attempt / Give Up
New mask
New WrongGuesses count

## Suppressed content

Word, MaxWrong are Hidden and MUST NOT appear in any UI surface until
the game ends. At GameOver, ending narration reveals the Word via
Mask (which becomes equal to Word for both Win and Lose).

MaxWrong is Hidden throughout so the player cannot deduce runtime
internals by asking about it directly.
