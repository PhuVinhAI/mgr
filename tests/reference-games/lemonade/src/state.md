@section state

<!-- PRD-006 v1.1 State System + PRD-008 §6 State Schema + PRD-008 §15a.1
     Section Schema. -->

## Variables

<!-- Each variable declares its Visibility per §15a.1. -->

Variable Money
Visibility: Public

Variable Day
Visibility: Public

Variable Reputation
Visibility: Public

Variable Price
Visibility: Public

Variable Weather
Visibility: Public

Variable Customers
Visibility: Private

<!-- Customers is Private per PRD-006 §16 — revealed only in the
     end-of-day summary. -->

Variable Lemons
Visibility: Public

Variable Sugar
Visibility: Public

Variable Ice
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
