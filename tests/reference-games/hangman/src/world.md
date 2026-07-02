@section world

<!-- PRD-008 §5 World Definition -->

Time:
A single session. Each Turn is one guess by the player.

Setting:
An abstract puzzle — no physical world. The runtime presents a masked
word, the player types guesses, the runtime updates the mask.

Economy:
No money. Progress is measured in WrongGuesses (out of MaxWrong = 6)
and in how many characters of the mask are still hidden.

Physics:
None. The word is a fixed string. Letter matching is case-insensitive.

Culture:
No characters. The runtime speaks as the referee.
