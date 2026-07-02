@section state-contract

<!-- Per-game State Contract. The MGR default state-contract is
     generic (Entity / Property / Collection / Flag / Variable /
     Relationship / three-visibility). Lemonade is entity-lean and
     variable-heavy: two singleton entities (Stand + Weather) and a
     flat economy of scalars. This contract nails down the schema
     for this game while preserving runtime-level invariants (state
     is the single source of truth, only the runtime mutates state,
     no JSON). -->

State for lemonade is a fixed shape. Every runtime decision derives
from state; nothing else is authoritative.

Entities.
- Stand — one per session. Attributes: Money, Reputation, Lemons,
  Sugar, Ice, Price. All Public.
- Weather — one per Day. Attributes: Weather (visible name),
  TodayDemand, TodayTemperature. Weather is Public; TodayDemand and
  TodayTemperature are Hidden.

Variables outside the entities.
- Day: integer 1..20, Public. Advances at End of Day.
- Customers: integer, Private. Set by Simulation, revealed only in
  the End-of-Day Recap.
- FestivalChance, SupplyShortageChance: probabilities, Hidden. Read
  by Post events; never rendered.

No collections, no relationships, no timers, no history entity. Turn
history is kept by the runtime per PRD-005; the game does not
declare its own history.

Visibility summary.
- Public:  Day, Money, Reputation, Lemons, Sugar, Ice, Price,
           Weather (name).
- Private: Customers.
- Hidden:  TodayDemand, TodayTemperature, FestivalChance,
           SupplyShortageChance.

Any variable added to the game must declare a Visibility. Unlabeled
variables are treated as Public with a warning in turn history — see
state.md.

Invariants.
- Lemons >= 0, Sugar >= 0, Ice >= 0.
- 0 <= Reputation <= 100.
- 1 <= Day <= 20.
- Price >= 0. Money may go negative — bankruptcy is a valid ending.
- Customers >= 0 when set. Customers <= TodayDemand.
- Weather in {Sunny, Rainy, Heat Wave}.

Mutation.
State only changes at the State Commit step of the turn loop. Pre
events (Weather Roll, Rain, Heat Wave) write to hidden state during
the Pre Event Phase; they never commit until State Commit fires.
Post events (Festival, Supply Shortage) read post-Simulation state
and enqueue changes for the same commit.

Serialization.
Because the UI Contract omits the per-turn State Snapshot slot,
lemonade does not emit a snapshot every day. Save/load, when
introduced, will serialize as:

```
Day: <n>
Weather:
  Name: <Sunny | Rainy | Heat Wave>
  TodayDemand: <int>
  TodayTemperature: <Hot | Warm | Cool>
Stand:
  Money: <int>
  Reputation: <int>
  Lemons: <int>
  Sugar: <int>
  Ice: <int>
  Price: <int>
Private:
  Customers: <int or unset>
```

Markdown key/value pairs; never JSON. Hidden probabilities
(FestivalChance, SupplyShortageChance) are constants for this game;
they are NOT serialized — the runtime re-seeds them from the game
package on load.

Ownership.
Only the runtime mutates state. Player input is a request; rules
decide the resulting values. Pricing and purchase actions are
requests; the Stand does not update its own Money.
