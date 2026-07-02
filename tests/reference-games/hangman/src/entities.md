@section entities

<!-- PRD-008 §7 Entity Definition + PRD-008 §15a.2 Section Schema +
     PRD-014 §5.2 Documentation. -->

## Player

Entity Player
Kind: Persistent

Attributes:
GuessedLetters, WrongGuesses

Behaviour:
Submits one guess per Turn — a single letter, a whole word, or Give Up.

Relationships:
Faces one Puzzle at a time.

Purpose:
The single actor of the game. Everything the player types goes through
PRD-012 Action Resolution before hitting Guard Rules.

## Puzzle

Entity Puzzle
Kind: Persistent

Attributes:
Word, Mask, MaxWrong

Behaviour:
Holds the secret Word and the current Mask. Updated by
ApplyLetterCorrect whenever a guessed letter appears in Word.

Relationships:
Presented to Player.

Purpose:
The word-and-mask pair that defines a run. In the reference game there
is exactly one Puzzle per session.
