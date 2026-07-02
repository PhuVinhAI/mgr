@section rules

<!-- PRD-008 §8 Rules + PRD-008 §15a.4 Section Schema + PRD-010 Rule
     Language + PRD-011 Rule Execution Model + PRD-014 Documentation. -->

## Guess-letter rules

Rule CanGuessLetter

Kind: Guard

Trigger:
On Action(Guess Letter)

Precondition:
GameOver = false AND NOT (Letter in GuessedLetters)

<!-- `Letter in GuessedLetters` and `Letter in Word` use a String-
     containment operator that is not yet in PRD-009 Formula grammar.
     Logged as GAP-010 in gaps.md. -->

Purpose:
Reject Guess Letter input when the game has already ended or the
player is repeating a letter they already tried.

Failure:
Reject action; response tells the player either the game is over or
that letter was already guessed.

Rule ApplyLetterCorrect

Kind: Transformation

Trigger:
On Action(Guess Letter)

Precondition:
GameOver = false AND Letter in Word

Effect:
Mask := Reveal(Mask, Word, Letter)
GuessedLetters := Append(GuessedLetters, Letter)

Priority:
0

Purpose:
When the guessed Letter is in Word, reveal every occurrence in Mask
and record the letter in GuessedLetters. Reveal/Append are String
helpers documented in gaps.md::GAP-010.

Failure:
If Letter is not in Word, ApplyLetterWrong fires instead.

Rule ApplyLetterWrong

Kind: Transformation

Trigger:
On Action(Guess Letter)

Precondition:
GameOver = false AND NOT (Letter in Word)

Effect:
WrongGuesses += 1
GuessedLetters := Append(GuessedLetters, Letter)

Priority:
0

Purpose:
When the guessed Letter is not in Word, increment WrongGuesses and
record the letter as tried. Reaching MaxWrong ends the game as a loss
via CheckLose.

Failure:
If both ApplyLetterCorrect and ApplyLetterWrong fail Precondition,
CanGuessLetter should have already rejected the action — this Rule
does not fire.

## Guess-word rules

Rule CanGuessWord

Kind: Guard

Trigger:
On Action(Guess Word)

Precondition:
GameOver = false

Purpose:
Reject Guess Word input after the game has ended. No other guard is
needed — the word is compared verbatim in the Transformation.

Failure:
Reject action; response tells the player the game is already over.

Rule ApplyGuessWord

Kind: Transformation

Trigger:
On Action(Guess Word)

Precondition:
GameOver = false AND WordGuess = Word

Effect:
Mask := Word
Won := true
GameOver := true

Priority:
0

Purpose:
When the whole word is guessed correctly, reveal it in Mask, mark the
game won, and set GameOver so no further input is accepted.

Failure:
Falls through to ApplyGuessWordWrong when WordGuess does not match.

Rule ApplyGuessWordWrong

Kind: Transformation

Trigger:
On Action(Guess Word)

Precondition:
GameOver = false AND NOT (WordGuess = Word)

Effect:
WrongGuesses += 1

Priority:
0

Purpose:
A wrong whole-word guess costs one WrongGuess, same as a wrong letter.
Discourages spamming random words.

Failure:
Precondition already excludes GameOver=true; nothing to reject beyond
that.

## Give up

Rule ApplyGiveUp

Kind: Transformation

Trigger:
On Action(Give Up)

Precondition:
GameOver = false

Effect:
Mask := Word
Won := false
GameOver := true

Priority:
0

Purpose:
Let the player concede the game. Reveals the word and marks the game
as a non-win. Recorded in Turn History like any other Action.

Failure:
Reject if GameOver is already true; state does not change.

## End-condition triggers

<!-- Trigger Rules run in Post Event Phase (PRD-005 §7a). They inspect
     Simulation results and decide whether the game just ended. -->

Rule CheckWin

Kind: Trigger

Trigger:
On Post Event

Precondition:
GameOver = false AND NOT (Underscore in Mask)

Effect:
Won := true
GameOver := true

Priority:
10

Purpose:
When the Mask no longer contains any underscore, the player has
revealed the full word. Mark the game won.

Rule CheckLose

Kind: Trigger

Trigger:
On Post Event

Precondition:
GameOver = false AND WrongGuesses >= MaxWrong

Effect:
Mask := Word
Won := false
GameOver := true

Priority:
10

Purpose:
When WrongGuesses reaches MaxWrong (6), the game ends as a loss.
Reveal the word in Mask so the ending narration has something to show.

## Rule priority

<!-- CheckWin and CheckLose both fire at Priority 10 in Post Event.
     They cannot both apply on the same Turn — CheckWin requires
     Mask has no underscore, CheckLose requires WrongGuesses = 6.
     Runtime resolves via §15a declaration order (PRD-010 §10). -->
