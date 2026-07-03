@section state

<!-- PRD-006 v1.1 State System + PRD-008 §6 State Schema + PRD-008 §15a.1
     Section Schema + PRD-014 §5.1 Documentation.
     Block declarations use first-class directives. -->

## Variables

@variable Word
Visibility: Hidden
Purpose:
The secret word the player must guess. Runtime keeps this hidden until
the game ends; UI renders it as ??? per PRD-007.

@variable Mask
Visibility: Public
Purpose:
Display pattern such as "M _ R K _ O _ N". Every position is either
the correctly-guessed letter or an underscore. This is what the player
sees on the dashboard.

@variable GuessedLetters
Visibility: Public
Purpose:
Comma-separated string of letters the player has already tried. Used
by CanGuessLetter to reject repeats.

@variable WrongGuesses
Visibility: Public
Purpose:
Count of incorrect guesses so far. Reaching MaxWrong ends the game as
a loss.

@variable MaxWrong
Visibility: Hidden
Purpose:
Loss threshold. Fixed at 6 for this game; kept Hidden so the player
cannot game the runtime by asking directly.

@variable GameOver
Visibility: Public
Purpose:
True after any ending Rule fires (win, lose, give up). Every Guard
consults it to reject further input.

@variable Won
Visibility: Public
Purpose:
True when the player successfully revealed the word or guessed it
whole. False on loss or give-up.

## Invariants

<!-- PRD-006 §14 State Invariants. -->

WrongGuesses >= 0
WrongGuesses <= MaxWrong
MaxWrong = 6
GameOver in {true, false}
Won in {true, false}
