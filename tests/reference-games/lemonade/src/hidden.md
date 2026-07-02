@section hidden-state

<!-- PRD-006 §11 Hidden State + §11a Visibility Declaration (v1.1). -->

## Hidden variables

Variable TodayDemand
Visibility: Hidden

Variable TodayTemperature
Visibility: Hidden

Variable FestivalChance
Visibility: Hidden

Variable SupplyShortageChance
Visibility: Hidden

Variable IcePerCup
Visibility: Hidden
<!-- IcePerCup defaults to 1 and is set to 2 by the Heat Wave Pre Event
     Rule (see rules.md). -->

## Notes

TodayDemand is rolled during Pre Event Phase (PRD-005 §7) and drives
the Simulation in `rules.md`. The player never sees the raw number,
only the resulting Customers count in the end-of-day summary.

TodayTemperature is a categorical hidden value (Cool / Warm / Hot /
Heat Wave) derived from the visible Weather plus a hidden roll. It
modulates demand for Ice specifically.
