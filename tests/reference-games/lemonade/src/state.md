@section state

<!-- PRD-006 v1.1 State System + PRD-008 §6 State Schema + PRD-008 §15a.1
     Section Schema. Block declarations use first-class directives. -->

## Public variables

<!-- Every variable declares its Visibility per §15a.1. -->

@variable Money
Visibility: Public

@variable Day
Visibility: Public

@variable Reputation
Visibility: Public

@variable Price
Visibility: Public

@variable Weather
Visibility: Public

<!-- Customers is Private per PRD-006 §16 — revealed only in the
     end-of-day summary. -->

@variable Customers
Visibility: Private

@variable Lemons
Visibility: Public

@variable Sugar
Visibility: Public

@variable Ice
Visibility: Public

## Invariants

<!-- PRD-006 §14 State Invariants. -->

Money >= 0 is NOT enforced — Money may go negative (see ending.md).
Lemons >= 0
Sugar >= 0
Ice >= 0
Reputation between 0 and 100
Day between 1 and 20
Price >= 0

@import hidden.md
