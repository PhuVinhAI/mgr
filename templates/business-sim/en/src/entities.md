@section entities

<!-- PRD-008 §7 Entity Definition + PRD-006 §5a Transient Entity +
     PRD-008 §15a.2 Section Schema + PRD-014 Documentation.
     Block declarations use first-class directives (@entity). -->

## Persistent entities

<!-- Persistent entities live in the snapshot and survive across turns.
     Most business-sims have: Player, Business, Staff, Customer. -->

<!-- EXAMPLE — keep, edit, or delete. -->

@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Owns the Business and decides actions each turn.
Relationships:
Owns one Business; hires Staff.

@entity Business
Kind: Persistent
Attributes:
Stock, Price, DailyRevenue
Behaviour:
Sells inventory to Customers, pays rent and salaries at end of day.
Relationships:
Belongs to Player.

<!-- TODO: declare the other persistent entities your game needs.
     Examples: Staff (with Wage attribute), Customer (with Demand).
-->

## Transient entities

<!-- Transient entities exist for one phase only — never enter the
     snapshot, never appear in Turn History (PRD-006 §5a). Use them
     for per-iteration state during a Simulation Phase. -->

@entity Sale
Kind: Transient
Lifetime: Simulation Phase
Attributes:
Revenue, CostOfGoods
Behaviour:
Instantiated once per Customer served during Simulation, then
discarded when the phase ends.

<!-- TODO: declare any other transient entities. Examples:
     - Transaction (per purchase)
     - SpoilageEvent (per spoiled unit)
-->

<!-- Keep this section even if empty — many validators expect it. -->
