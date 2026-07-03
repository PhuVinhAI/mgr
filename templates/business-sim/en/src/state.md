@section state

<!-- PRD-006 State System + PRD-008 §6 State Schema +
     PRD-008 §15a.1 Section Schema + PRD-014 Documentation.
     Block declarations use first-class directives (@variable). -->

## Public variables

<!-- Public: shown on the dashboard. Declare one variable per concept.
     Visibility values: Public | Private | Hidden.
       - Public  → always visible to the player
       - Private → surfaces only in end-of-day summary
       - Hidden  → never leaves the runtime
     See PRD-006 §16 for the visibility contract. -->

<!-- EXAMPLES — keep, edit, or delete as a starting point. -->

@variable Money
Visibility: Public
Purpose:
Cash on hand, in whole currency units. The game ends if this drops
below zero unless your rules say otherwise.

@variable Day
Visibility: Public
Purpose:
Current day number, starting at 1. Used by time-based Events (rent,
salaries, expiry).

@variable Reputation
Visibility: Public
Purpose:
How customers feel about the shop. Drives demand, hiring pool, and
some Events. Typical range 0–100.

@variable Price
Visibility: Public
Purpose:
Current per-unit selling price. The player can change it via a Set
Price action.

<!-- TODO: declare more public variables that match your game.
     Examples: Stock, StaffCount, Customers, CashFlow. -->

## Private variables

<!-- Private: visible only in summaries (end-of-day, end-of-month). -->

@variable DailyRevenue
Visibility: Private
Purpose:
Revenue earned today. Surfaces in the end-of-day summary so the
player can audit performance without seeing every transaction.

<!-- TODO: add other private variables. Example: CustomersServed,
     SpoilageToday. -->

## Hidden variables

<!-- Hidden: never shown. Used for state the runtime tracks but the
     player must never see (cheating risk, design reveal). -->

@variable SupplyShortageChance
Visibility: Hidden
Purpose:
Whether today's supply chain is constrained. Set by a Pre Event and
read by a Transformation Rule (see rules.md example).

<!-- TODO: add other hidden variables. Examples: Weather, SpoilageRate,
     FestivalChance. -->

## Invariants

<!-- PRD-006 §14 State Invariants. One per line, plain English. The
     runtime must enforce these at every State Commit. -->

<!-- EXAMPLES -->

Money >= 0
Day >= 1
Reputation between 0 and 100
Price >= 0

<!-- TODO: add invariants for every variable you declare. -->
