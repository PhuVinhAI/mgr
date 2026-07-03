@section state

<!-- PRD-006 State System + PRD-008 §6 State Schema +
     PRD-008 §15a.1 Section Schema + PRD-014 Documentation.
     Block declarations use first-class directives (@variable). -->

## Variables

<!-- Each variable is declared once with @variable <Name> and a
     Visibility block. Use Public if the player can see it, Private if
     it surfaces only in summaries, Hidden if it never leaves the
     runtime. -->

<!-- EXAMPLE — keep, edit, or delete as a starting point. -->

@variable Score
Visibility: Public
Purpose:
The player's running score. Grows when the player wins rounds and
resets when the game ends.

<!-- TODO: declare the rest of your variables here. One @variable per
     concept. Examples:
       @variable Health  Visibility: Public
       @variable Turn    Visibility: Public
       @variable Secret  Visibility: Hidden
-->

## Invariants

<!-- PRD-006 §14 State Invariants — list any range / value rules that
     the runtime must respect at every State Commit. One invariant per
     line, plain English. -->

<!-- EXAMPLE -->

Score >= 0

<!-- TODO: add more invariants that match your variables. Examples:
       Health between 0 and 100
       Turn >= 1
-->
