@section rules

<!-- PRD-008 §8 Rules + PRD-010 Rule Language + PRD-009 Formula System. -->

## Named formulas

<!-- PRD-009 §14 Named formulas — reusable formulas resolve at Build time. -->

Formula BaseDemand
Reputation × 0.5 + 10

Formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 2.0
Otherwise                 Then 1.0

## Purchase rules

<!-- PRD-010 §4 Guard + §13 Transformation pattern. Precondition uses
     PRD-009 §7 comparison and §6 arithmetic. -->

Rule CanBuyLemons

Kind: Guard

Trigger:
On Action(Buy Lemons)

Precondition:
Money ≥ Quantity × 5

Rule ApplyBuyLemons

Kind: Transformation

Trigger:
On Action(Buy Lemons)

Precondition:
Money ≥ Quantity × 5

Effect:
Money -= Quantity × 5
Lemons += Quantity

Rule CanBuySugar

Kind: Guard

Trigger:
On Action(Buy Sugar)

Precondition:
Money ≥ Quantity × 3

Rule ApplyBuySugar

Kind: Transformation

Trigger:
On Action(Buy Sugar)

Precondition:
Money ≥ Quantity × 3

Effect:
Money -= Quantity × 3
Sugar += Quantity

Rule CanBuyIce

Kind: Guard

Trigger:
On Action(Buy Ice)

Precondition:
Money ≥ Quantity × 2

Rule ApplyBuyIce

Kind: Transformation

Trigger:
On Action(Buy Ice)

Precondition:
Money ≥ Quantity × 2

Effect:
Money -= Quantity × 2
Ice += Quantity

## Selling rules

<!-- PRD-010 §14 Trigger Rule pattern — runs during Simulation, one
     Cup at a time until an ingredient is depleted. -->

Rule SellOneCup

Kind: Transformation

Trigger:
On Action(Start Selling)

Precondition:
Lemons ≥ 1 AND Sugar ≥ 1 AND Ice ≥ IcePerCup AND Customers ≥ 1

Effect:
Lemons -= 1
Sugar -= 1
Ice -= IcePerCup
Customers -= 1
Money += Price

## Demand rule

<!-- PRD-009 §11 Monotonic hints — the demand curve is not fully
     specified, only the direction. -->

Formula CustomersToday
BaseDemand × WeatherModifier - Price × 0.05

Monotonic(CustomersToday, Increases With Reputation)
Monotonic(CustomersToday, Decreases With Price)

Rule RollCustomers

Kind: Trigger

Trigger:
On Pre Event

Effect:
Customers := Max(0, Round(CustomersToday))

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

## Rule priority

<!-- PRD-010 §10 Priority + PRD-005 §8 Rule Resolution. -->

Only Game Rules and Event Rules exist in this game. When both apply
in the same phase, Priority is used; higher runs first. Guards run
during Validation, Transformations during Simulation, Triggers during
their declared phase.
