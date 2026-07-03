@section rules

<!-- PRD-008 §8 Rules + PRD-008 §15a.4 Section Schema +
     PRD-010 Rule Language + PRD-009 Formula System +
     PRD-011 Rule Execution Model +
     PRD-014 Documentation Schema.
     Block declarations use first-class directives. -->

## Named formulas

<!-- PRD-009 §14 Named formulas — resolve at Build time.
     PRD-009 §18a — body must be an expression, not prose. -->

@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Baseline number of customers before weather or price modifiers. Higher
Reputation attracts more customers linearly.

@formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 2.0
Otherwise                 Then 1.0
Purpose:
Multiplicative demand modifier applied to BaseDemand. Rainy halves,
Heat Wave doubles, Sunny is neutral.

@formula CustomersToday
BaseDemand * WeatherModifier - Price * 0.05
Purpose:
Final customer count for the day. Falls with price, rises with weather
and reputation. Monotonic hints below constrain LLM reasoning.

## Purchase rules

<!-- Guard per §15a.4: Trigger + Precondition, no Effect.
     Transformation per §15a.4: Trigger + Precondition + Effect. -->

@rule CanBuyLemons
Kind: Guard
Trigger:
On Action(Buy Lemons)
Precondition:
Money >= Quantity * 5
Purpose:
Block the Buy Lemons action when the player cannot afford the total.
Prevents Money from going negative from a lemon purchase.
Failure:
Reject action; ApplyBuyLemons does not fire; no state change.

@rule ApplyBuyLemons
Kind: Transformation
Trigger:
On Action(Buy Lemons)
Precondition:
Money >= Quantity * 5
Effect:
Money -= Quantity * 5
Lemons += Quantity
Priority:
0
Purpose:
Perform the Buy Lemons purchase — deduct Money and add Lemons in one
atomic step (PRD-011 §9).
Failure:
If Precondition fails at execution time (state changed between guard
and simulation), rule is skipped whole and Turn History records
SkippedByPrecondition.

@rule CanBuySugar
Kind: Guard
Trigger:
On Action(Buy Sugar)
Precondition:
Money >= Quantity * 3
Purpose:
Block the Buy Sugar action when the player cannot afford the total.
Failure:
Reject action; ApplyBuySugar does not fire.

@rule ApplyBuySugar
Kind: Transformation
Trigger:
On Action(Buy Sugar)
Precondition:
Money >= Quantity * 3
Effect:
Money -= Quantity * 3
Sugar += Quantity
Priority:
0
Purpose:
Perform the Buy Sugar purchase atomically.
Failure:
If Precondition fails at execution time, rule is skipped whole.

@rule CanBuyIce
Kind: Guard
Trigger:
On Action(Buy Ice)
Precondition:
Money >= Quantity * 2
Purpose:
Block the Buy Ice action when the player cannot afford the total.
Failure:
Reject action; ApplyBuyIce does not fire.

@rule ApplyBuyIce
Kind: Transformation
Trigger:
On Action(Buy Ice)
Precondition:
Money >= Quantity * 2
Effect:
Money -= Quantity * 2
Ice += Quantity
Priority:
0
Purpose:
Perform the Buy Ice purchase atomically.
Failure:
If Precondition fails at execution time, rule is skipped whole.

## Selling rule

<!-- One cup per iteration. Runtime iterates until an ingredient runs
     out or Customers reaches 0 (PRD-011 §7 Effect Evaluation Order). -->

@rule SellOneCup
Kind: Transformation
Trigger:
On Action(Start Selling)
Precondition:
Lemons >= 1 AND Sugar >= 1 AND Ice >= IcePerCup AND Customers >= 1
Effect:
Lemons -= 1
Sugar -= 1
Ice -= IcePerCup
Customers -= 1
Money += Price
Priority:
0
Purpose:
Sell exactly one cup: consume one lemon, one sugar, IcePerCup ice
cubes, one customer, and credit Price to Money. Runtime iterates this
Rule until any Precondition subterm fails.
Failure:
Stop iterating; End Day Auto Action then fires (see actions.md).

## Demand rule

<!-- PRD-009 §11 Monotonic hints — direction only, not full formula. -->

@rule RollCustomers
Kind: Trigger
Trigger:
On Pre Event
Effect:
Customers := Max(0, Round(CustomersToday))
Priority:
5
Purpose:
Convert the CustomersToday formula into the concrete Customers count
at the start of Simulation Phase. Clamped to a non-negative integer.

@rule ApplyShortage
<!-- Priority higher than SellOneCup so the shortage effect resolves
     before Simulation reads the ingredient cost (PRD-011 §11 Modifier
     Layering). -->
Kind: Trigger
Trigger:
On Pre Event
Precondition:
SupplyShortageChance = 1
Effect:
LemonPrice := 10
Priority:
10
Purpose:
Double LemonPrice from the baseline 5 cents to 10 cents on shortage
days. Runs before RollCustomers in Pre Event Phase due to higher
Priority.

## Overnight rule

<!-- Runs at Turn boundary — modelled as Post Event before Commit. -->

@rule Overnight
Kind: Trigger
Trigger:
On Post Event
Effect:
Ice := 0
Day += 1
IcePerCup := 1
SupplyShortageChance := 0
LemonPrice := 5
Priority:
0
Purpose:
Reset the day: melt leftover Ice, advance the calendar, reset the
IcePerCup recipe, and clear per-day shortage flags so tomorrow starts
from a known baseline.

## Rule priority

<!-- PRD-010 §10 Priority + PRD-005 §8 Rule Resolution + PRD-011 §10
     Conflict Policy. When two Rules touch the same Variable in the
     same Phase, higher Priority runs first. Same Priority: additive
     ops sum, multiplicative ops compose, `:=` requires an explicit
     winner. -->
