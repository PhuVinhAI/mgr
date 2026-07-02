@section start

<!-- PRD-008 §13 Start Scenario -->

## Initial state

Word = "MARKDOWN"
Mask = "_ _ _ _ _ _ _ _"
GuessedLetters = ""
WrongGuesses = 0
MaxWrong = 6
GameOver = false
Won = false

<!-- Word is a fixed reference word in this game. A future variant may
     pick from a Collection of candidate words — that would stress
     PRD-013 Query & Selector. -->

## Opening narrative

I am thinking of an eight-letter word. Guess it one letter at a time,
or attempt the whole word in one shot. Six wrong guesses ends the
game. Type `help` for the reserved-intent menu.

## First event

None. The Word is already fixed; Mask is already initialized.

## First action prompt

Runtime asks the player for a guess. Any single character is treated
as Guess Letter. Any longer input is treated as Guess Word unless the
input starts with a reserved intent (help / quit / retry).
