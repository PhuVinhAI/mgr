@section rules

<!-- PRD-008 §8 Rules + PRD-008 §15a.4 Section Schema +
     PRD-010 Rule Language + PRD-009 Formula System +
     PRD-011 Rule Execution Model. -->

## Named formulas

<!-- PRD-009 §14 Named formulas — resolve at Build time. -->

Formula BaseDemand
Reputation * 0.5 + 10

Formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 2.0
Otherwise                 Then 1.0

Formula CustomersToday
BaseDemand * WeatherModifier - Price * 0.05

## Purchase rules

<!-- Guard per §15a.4: Trigger + Precondition, no Effect.
     Transformation per §15a.4: Trigger + Precondition + Effect. -->

Rule CanBuyLemons

Kind: Guard

Trigger:
On Action(Buy Lemons)

Precondition:
Money >= Quantity * 5

Rule ApplyBuyLemons

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

Rule CanBuySugar

Kind: Guard

Trigger:
On Action(Buy Sugar)

Precondition:
Money >= Quantity * 3

Rule ApplyBuySugar

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

Rule CanBuyIce

Kind: Guard

Trigger:
On Action(Buy Ice)

Precondition:
Money >= Quantity * 2

Rule ApplyBuyIce

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

## Selling rule

<!-- One cup per iteration. Runtime iterates until an ingredient runs
     out or Customers reaches 0 (PRD-011 §7 Effect Evaluation Order). -->

Rule SellOneCup

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

## Demand rule

<!-- PRD-009 §11 Monotonic hints — direction only, not full formula. -->

Rule RollCustomers

Kind: Trigger

Trigger:
On Pre Event

Effect:
Customers := Max(0, Round(CustomersToday))

Priority:
5

Rule ApplyShortage

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

## Overnight rule

<!-- Runs at Turn boundary — modelled as Post Event before Commit. -->

Rule Overnight

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

## Rule priority

<!-- PRD-010 §10 Priority + PRD-005 §8 Rule Resolution + PRD-011 §10
     Conflict Policy. When two Rules touch the same Variable in the
     same Phase, higher Priority runs first. Same Priority: additive
     ops sum, multiplicative ops compose, `:=` requires an explicit
     winner. -->
