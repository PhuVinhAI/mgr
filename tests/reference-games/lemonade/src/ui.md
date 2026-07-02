@section ui

<!-- PRD-008 §12 UI Configuration — Game specifies content only; Layout
     comes from PRD-007 UI Contract. -->

## Dashboard content

Day (of 20)
Money
Weather
Reputation
Lemons
Sugar
Ice
Price (if set)

## End-of-day summary content

Customers served
Cups sold
Revenue
Ingredients remaining
Reputation change
Event(s) fired

<!-- The end-of-day summary is the only place Customers becomes visible.
     Before Simulation, Customers is Private (PRD-006 §16). -->

## Suppressed content

TodayDemand, TodayTemperature, FestivalChance, SupplyShortageChance are
Hidden and MUST NOT appear in any UI surface.
