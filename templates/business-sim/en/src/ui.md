@section ui

<!-- PRD-008 §12 UI Configuration — Game specifies content only.
     Layout comes from PRD-007 UI Contract; do not duplicate layout
     here. -->

## Dashboard content

<!-- TODO: list the variables that should appear on the player's main
     dashboard, in the order you want them shown. -->

Day (of MaxDay)
Money
Reputation
Stock
Price (if set)

## End-of-day summary content

<!-- TODO: list the per-day report fields. Include Private variables
     here — this is where they surface to the player. -->

Customers served
Units sold
Revenue
Costs (rent, salaries, spoilage)
Reputation change
Event(s) fired

## Suppressed content

<!-- TODO: list every Hidden variable and assert that the runtime must
     never render them on any UI surface. -->

Weather, SupplyShortageChance, and any other Hidden variable from
state.md MUST NOT appear in any UI surface.
