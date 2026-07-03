@section rules

<!-- PRD-008 §8 Rules + PRD-008 §15a.4 Section Schema +
     PRD-010 Rule Language + PRD-009 Formula System +
     PRD-011 Rule Execution Model + PRD-014 Documentation.
     Block declarations use first-class directives (@formula, @rule). -->

## Named formulas

<!-- PRD-009 §14 — Named formulas resolve at Build time.
     PRD-009 §18a — body must be an expression, not prose.
     Common shapes: single line, piecewise (When/Then/Otherwise),
     reference to another Named Formula, bounded expression. -->

<!-- EXAMPLES — keep, edit, or delete. -->

@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Baseline customers before modifiers. Higher Reputation means more
customers, linearly.

@formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 1.5
Otherwise                 Then 1.0
Purpose:
Multiplicative demand modifier. Pieced together from a categorical
Weather variable.

<!-- TODO: add the formulas your game needs. Examples: SpoilageRate,
     WageCost, EndOfDayBalance. -->

## Action rules

<!-- Per PRD-008 §15a.4:
       - Guard         → Trigger + Precondition, no Effect
       - Transformation → Trigger + Precondition + Effect
     A complete Action usually has one Guard and one Transformation
     with the same Trigger. -->

<!-- EXAMPLE — keep, edit, or delete. -->

@rule CanBuyStock
Kind: Guard
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Purpose:
Block Buy Stock when the player cannot afford the total. Prevents
Money from going negative through a purchase.
Failure:
Reject action; ApplyBuyStock does not fire; no state change.

@rule ApplyBuyStock
Kind: Transformation
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Effect:
Money -= Quantity * UnitCost
Stock += Quantity
Priority:
0
Purpose:
Perform the purchase atomically: deduct Money, add Stock in one step
(PRD-011 §9). If Precondition fails at execution time (state changed
between guard and simulation), the Rule is skipped whole and Turn
History records SkippedByPrecondition.
Failure:
If Precondition fails at execution time, rule is skipped; no state
change.

<!-- TODO: add a CanX / ApplyX pair for every Action your player can
     take. See actions.md for the action list. -->

## Time-based rules

<!-- Trigger Rules fire on Event Phases (PRD-005 §7 / §7a). -->
<!-- Post Event rules run after Simulation, before Commit. -->

<!-- EXAMPLE — keep, edit, or delete. -->

@rule ChargeDailyCosts
Kind: Trigger
Trigger:
On Post Event
Effect:
Money -= DailyRent
Priority:
0
Purpose:
Charge rent and any recurring daily costs at end of each day, before
the day counter advances.

@rule AdvanceDay
Kind: Trigger
Trigger:
On Post Event
Effect:
Day += 1
Priority:
0
Purpose:
Advance the in-game calendar. Runs after ChargeDailyCosts.

<!-- TODO: add rules for: spoilage, salary payment, reputation drift,
     end-of-day summary population, etc. -->

## Rule priority

<!-- PRD-010 §10 + PRD-005 §8 + PRD-011 §10. When two Rules touch the
     same Variable in the same Phase, higher Priority runs first.
     Same Priority: additive ops sum, multiplicative ops compose,
     `:=` requires an explicit winner.
-->
