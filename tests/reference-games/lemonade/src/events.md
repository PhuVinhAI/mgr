@section events

<!-- PRD-008 §9 Events + PRD-005 v1.1 §7 Pre Event / §7a Post Event. -->

## Pre Events (§7)

Environmental setup — resolves before Simulation, cannot commit.

### Weather roll

Trigger:
Start of Day.

Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)

### Rain

Trigger:
Weather = Rainy

Effect:
BaseDemand is halved via WeatherModifier (see rules.md).

### Heat Wave

Trigger:
Weather = Heat Wave

Effect:
IcePerCup := 2

<!-- PRD-005 §7: Heat Wave fires in Pre Event Phase so IcePerCup is
     set BEFORE Simulation reads the recipe. Resolves GAP-004. -->

### Supply Shortage

Trigger:
Random, ~15% chance at start of any day after Day 5.

Effect:
Lemon unit cost doubles for that day only (a Rule reads the current
LemonPrice hidden variable).

## Post Events (§7a)

Consequences — resolve after Simulation, before Commit.

### Festival

Trigger:
Weighted by FestivalChance, evaluated after Simulation on days when
Customers > 0.

Effect:
Reputation += Clamp(5, 0, 100 - Reputation) if the stand sold out.

## Event ordering

<!-- PRD-005 v1.1 §15 Event Queue — Pre and Post use distinct queues. -->

Within a day:

Pre Event Queue:
1. Weather roll
2. Rain / Heat Wave effect (whichever matches)
3. Supply Shortage check

Simulation runs.

Post Event Queue:
1. Festival check

Commit.
