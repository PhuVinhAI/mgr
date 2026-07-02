@section events

<!-- PRD-008 §9 Events + PRD-008 §15a.5 Section Schema +
     PRD-005 v1.1 §7 Pre Event / §7a Post Event +
     PRD-014 Documentation Schema. -->

## Pre Events

<!-- Every event carries Phase, Trigger, Effect, Purpose (§15a.5 + §15a.11). -->

Event Weather Roll

Phase: Pre

Trigger:
Start of Day.

Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)

Purpose:
Roll the day's weather before Simulation reads demand. Sunny is the
default; Rainy suppresses demand; Heat Wave amplifies demand and
raises the ice-per-cup recipe.

Event Rain

Phase: Pre

Trigger:
Weather = Rainy

Effect:
TodayTemperature := Cool

Purpose:
Tag the day as Cool so ice demand drops. The visible Weather variable
stays at Rainy for the dashboard.

Event Heat Wave

Phase: Pre

Trigger:
Weather = Heat Wave

Effect:
IcePerCup := 2

<!-- PRD-005 §7: Heat Wave fires in Pre Event Phase so IcePerCup is
     set BEFORE Simulation reads the recipe. Resolves GAP-004. -->

Purpose:
Double the ice-per-cup recipe on Heat Wave days. Fires in Pre Event so
Simulation's SellOneCup rule reads the updated recipe before the day
begins.

Event Supply Shortage

Phase: Pre

Trigger:
Day >= 5 AND Uniform(1, 100) <= 15

Effect:
SupplyShortageChance := 1

Purpose:
15% chance from Day 5 onward that the day's lemon supply is
constrained. ApplyShortage Rule reads this flag and doubles LemonPrice
for the day.

## Post Events

<!-- Consequences — resolve after Simulation, before Commit. -->

Event Festival

Phase: Post

Trigger:
Customers = 0 AND Reputation >= 40

Effect:
Reputation += Clamp(5, 0, 100 - Reputation)

Purpose:
Reward selling out to a large crowd. Fires only when Reputation is
already 40+ so early-game players don't feel arbitrarily punished.

## Event ordering

<!-- PRD-005 v1.1 §15 Event Queue — Pre and Post use distinct queues. -->

Within a day the queues run in this fixed order:

Pre Event Queue:
1. Weather Roll
2. Rain / Heat Wave effect (whichever matches)
3. Supply Shortage check

Simulation runs.

Post Event Queue:
1. Festival check

Commit.
