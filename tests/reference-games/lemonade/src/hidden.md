@section hidden-state

<!-- PRD-006 §11 Hidden State + §11a Visibility Declaration (v1.1)
     + PRD-008 §15a.1 Section Schema.
     Block declarations use first-class directives. -->

## Hidden variables

@variable TodayDemand
Visibility: Hidden

@variable TodayTemperature
Visibility: Hidden

@variable FestivalChance
Visibility: Hidden

@variable SupplyShortageChance
Visibility: Hidden

@variable IcePerCup
Visibility: Hidden

<!-- IcePerCup defaults to 1 and is set to 2 by the Heat Wave Pre Event
     Rule (see rules.md). -->

@variable LemonPrice
Visibility: Hidden

<!-- LemonPrice defaults to 5 cents/unit and doubles when Supply Shortage
     fires (see rules.md::ApplyShortage). -->

## Notes

TodayDemand is rolled during Pre Event Phase (PRD-005 §7) and drives the
Simulation in rules.md. The player never sees the raw number, only the
resulting Customers count in the end-of-day summary.

TodayTemperature is a categorical hidden value (Cool / Warm / Hot / Heat
Wave) derived from the visible Weather. It modulates demand for Ice.
