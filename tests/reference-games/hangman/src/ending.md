@section ending

<!-- PRD-008 §11 Victory & Failure -->

## Win

At any State Commit:
Won = true AND GameOver = true → Player wins.

Runtime narrates the victory, prints the full Word, prints Turn count,
and stops accepting input.

## Lose

At any State Commit:
Won = false AND GameOver = true AND WrongGuesses >= MaxWrong →
Player loses.

Runtime narrates the loss, prints the full Word, prints Turn count,
and stops accepting input.

## Soft Ending

None. Hangman is binary: win or lose (Give Up counts as a loss for
scoring but is narrated differently — see below).

## Hard Ending

None. The game does not force a Turn cap.

<!-- PRD-008 §11: "Runtime does not end the game unless Package defines
     it." All ending conditions above are checked at State Commit by the
     Trigger Rules CheckWin and CheckLose in rules.md. -->

## Give-up ending

At any State Commit:
Won = false AND GameOver = true AND WrongGuesses < MaxWrong →
Player gave up voluntarily.

Runtime narrates a gentler ending than Lose — "the runtime reveals the
word" instead of "you failed". The Word is still revealed.
