@section actions

<!-- PRD-008 §10 Actions -->

## Available actions

Buy Lemons
Buy Sugar
Buy Ice
Set Price
Start Selling
End Day

## Action details

### Buy Lemons

Input:
quantity (positive integer)

Preconditions:
Money >= quantity × 5, Day has not started selling yet.

Effect:
Money -= quantity × 5. Lemons += quantity.

### Buy Sugar

Input:
quantity (positive integer)

Preconditions:
Money >= quantity × 3, Day has not started selling yet.

Effect:
Money -= quantity × 3. Sugar += quantity.

### Buy Ice

Input:
quantity (positive integer)

Preconditions:
Money >= quantity × 2, Day has not started selling yet.

Effect:
Money -= quantity × 2. Ice += quantity.

### Set Price

Input:
price in cents (non-negative integer)

Preconditions:
Day has not started selling yet.

Effect:
Price := input.

### Start Selling

Input:
none

Preconditions:
Price has been set at least once for this day.

Effect:
Runtime enters Simulation Phase for the day. Customers arrive, cups are
sold until an ingredient runs out or all Customers have been served.

### End Day

<!-- Emitted automatically by Runtime after Start Selling completes. Not
     player-callable. Included for completeness. -->

Input:
none

Preconditions:
Simulation Phase for the day has completed.

Effect:
Overnight rule applied. Day += 1. Turn Complete (PRD-005 §11).

## Input mapping

<!-- PRD-008 §10: "player may enter free text, Runtime must map to a valid
     Action or reject." -->

Runtime should accept common phrasings ("sell", "open shop", "start")
as Start Selling; ("buy 20 lemons") as Buy Lemons with quantity=20;
and so on. Any input that cannot be mapped is rejected in Validation
(PRD-005 §5).
