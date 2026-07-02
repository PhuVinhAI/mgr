@section actions

<!-- PRD-008 §10 Actions + PRD-008 §15a.6 Section Schema +
     PRD-012 Action Resolution + PRD-014 §5.6 Documentation. -->

## Actions

Action Guess Letter

Intent:
guess letter
try letter
letter

Parameters:
Letter: String

Preconditions:
GameOver = false

Purpose:
The primary Action. Player submits one letter; the runtime decides if
it appears in Word. Correct letters reveal positions in Mask; wrong
letters increment WrongGuesses.

Failure:
Reject if GameOver is true or Letter is not a single character.
Response explains the rejection; state does not change.

<!-- Action Resolution notes (PRD-012 §5-§8):
     - Single-character input ("a", "e", "M") should map to Guess
       Letter with Letter = that character. Runtime accepts this via
       the Passthrough default on Letter.
     - Input longer than 1 char with no explicit intent phrase should
       map to Guess Word — see below.
     - Ambiguity: input "apple" could be Guess Letter (a) or Guess
       Word (apple). PRD-012 §13 orders Guess Letter first in file,
       but Passthrough on Letter accepts only 1 char, so "apple"
       falls through to Guess Word. This is the reference behavior. -->

Action Guess Word

Intent:
guess word
the word is
try word
word

Parameters:
WordGuess: String

Preconditions:
GameOver = false

Purpose:
Attempt the whole word in one guess. A correct guess wins immediately;
a wrong guess costs one WrongGuess.

Failure:
Reject if GameOver is true. WordGuess itself is not rejected — a wrong
value falls into ApplyGuessWordWrong which charges one WrongGuess.

Action Give Up

Intent:
give up
i give up
surrender
concede

Preconditions:
GameOver = false

Purpose:
Let the player end the game without a win. Reveals the word in Mask
and sets GameOver = true, Won = false.

Failure:
Reject if the game is already over. Response tells the player the
game has already ended.
