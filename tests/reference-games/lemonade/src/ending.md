@section ending

<!-- PRD-008 §11 Victory & Failure -->

## Win

At the end of Day 20:
Money >= 500 cents → Player wins.

## Lose

At any State Commit:
Money < 0 → Player loses. Game ends immediately.

## Soft Ending

At the end of Day 20:
0 <= Money < 500 → Neutral ending. Runtime narrates a low-key summary.

## Hard Ending

None for this game.

<!-- PRD-008 §11: "Runtime does not end the game unless Package defines
     it." All three conditions above are checked at State Commit
     (Money < 0) and at end of Day 20 (Win / Soft). -->
