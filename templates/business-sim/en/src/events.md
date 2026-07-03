@section events

<!-- PRD-008 §9 Events + PRD-008 §15a.5 Section Schema +
     PRD-005 v1.1 §7 Pre Event / §7a Post Event +
     PRD-014 Documentation.
     Block declarations use first-class directives (@event). -->

## Pre Events

<!-- Pre Events fire before Simulation. They set up per-day state
     (weather, supply, market conditions). -->

<!-- EXAMPLE — keep, edit, or delete. -->

@event Weather Roll
Phase: Pre
Trigger:
Start of Day.
Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)
Purpose:
Roll today's weather before Simulation reads demand. Modify the
distribution to match your game's climate.

@event Supply Shortage
Phase: Pre
Trigger:
Day >= 5 AND Uniform(1, 100) <= 15
Effect:
SupplyShortageChance := 1
Purpose:
From Day 5 onward, 15% chance that today's supply is constrained. A
Transformation Rule reads this flag (see rules.md).

<!-- TODO: add Pre Events that fit your game. Examples:
     - Festival (boosts demand)
     - Inspection (checks permits)
     - Random Customer Complaint
-->

## Post Events

<!-- Post Events fire after Simulation, before Commit. Use them for
     consequences, rewards, and narrative. -->

@event Festival
Phase: Post
Trigger:
Customers = 0 AND Reputation >= 40
Effect:
Reputation += Clamp(5, 0, 100 - Reputation)
Purpose:
Reward a sell-out day. Trigger only when Reputation is already 40+
so early-game players don't feel arbitrarily punished.

<!-- TODO: add Post Events. Examples:
     - News Article (raises/lowers reputation)
     - Tax Audit
-->

## Event ordering

<!-- PRD-005 v1.1 §15 — Pre and Post use distinct queues. List the
     order your game expects; the runtime runs them in declaration
     order unless Priority is set. -->

Pre Event Queue:
1. Weather Roll
2. Supply Shortage check

Simulation runs.

Post Event Queue:
1. Festival check
2. Daily Costs (paid via Rule)

Commit.
