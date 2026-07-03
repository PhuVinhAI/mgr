@section entities

<!-- PRD-008 §7 Entity Definition + PRD-006 §5a Transient Entity (v1.1)
     + PRD-008 §15a.2 Section Schema. Block declarations use
     first-class directives. -->

## Player

@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Chooses Actions during each day's Input Phase.
Relationships:
Owns the Stand.

## Stand

@entity Stand
Kind: Persistent
Attributes:
Lemons, Sugar, Ice, Price
Behaviour:
Consumes ingredients when a Cup is sold.
Relationships:
Belongs to Player.

## Cup

<!-- PRD-006 §5a: Cup lives inside Simulation Phase only. Never enters
     the snapshot, never appears in Turn History. -->

@entity Cup
Kind: Transient
Lifetime: Simulation Phase
Attributes:
Cost, Revenue
Behaviour:
Instantiated once per Customer served during Simulation, then discarded
when the phase ends.
