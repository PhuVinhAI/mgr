@section ending

<!-- PRD-008 §11 Victory & Failure.
     Define how the game ends. The runtime does NOT end the game
     unless the Package defines it. -->

## Win

<!-- TODO: describe your win condition. Example:
       At the end of Day 30:
       Money >= 2000 AND Reputation >= 70 → Player wins.
     Multiple win tiers (C / B / A / S) are common in business-sims.
-->

## Lose

<!-- TODO: describe your lose conditions. Example:
       At any State Commit:
       Money < 0 → Player loses. Game ends immediately.
-->

## Soft ending

<!-- TODO: optional. A neutral ending for surviving but underperforming
     runs. Example:
       At the end of Day 30:
       0 <= Money < WinThreshold → Neutral ending.
-->

## Hard ending

<!-- TODO: optional. A forced ending for time-out or catastrophic
     events. Leave blank if your game has none.
-->

<!-- Keep this section even if you only have a Win condition —
     validators expect the file to exist. -->
