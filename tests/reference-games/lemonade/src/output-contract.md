@section output-contract

<!-- Per-game Output Contract. The MGR default five-part response
     envelope (Narrative / Effects / Updated State / Available
     Actions / Await) does not model the day/phase split lemonade
     needs. Days have two response shapes — Morning (decision) and
     End of Day (recap) — and the response envelope changes
     accordingly. Runtime-level invariants (response follows commit,
     response never mutates state, at least one available action per
     turn) still hold via the runtime layer. -->

A "turn" is a full day and produces two responses: Morning and End
of Day. Each has a fixed envelope.

## Morning response

Emitted at the start of every Day, after Weather Roll commits and
before the player sets Price / buys ingredients.

1. Day Header — `Day <n> of 20 — <Weather>`.
2. Morning Report — Ingredients + Reputation lines.
3. Dashboard — Money + Reputation.
4. Advisory — one short sentence about today's conditions, drawn
   from Weather. Never leaks TodayDemand. Examples:
   - Sunny: "Clear skies. Demand looks steady."
   - Rainy: "Puddles on the sidewalk. Fewer customers likely."
   - Heat Wave: "Blazing sun. Ice will disappear fast."
5. Prompt — `Set today's price and inventory purchases, or type
   "wait" to skip.`

## End-of-Day response

Emitted after the Simulation Phase commits and Post events resolve.

1. Day Header — same as Morning.
2. End-of-Day Recap — the four-line block from the UI Contract
   (Customers served / Revenue / Ingredients used / Reputation
   change).
3. Events — the day's public events, if any.
4. Dashboard — post-commit Money + Reputation.
5. Prompt — `Continue to day <n+1>?` at day 1..19, or the ending
   narrative at day 20 or when Money-out fires.

## Suppressed parts

The default "Available Actions" numbered list is omitted from both
responses. Actions surface through the Prompt sentence, which names
the player's move for the current phase. The default "Updated
State" block is omitted — Dashboard + Recap cover the same ground
without duplication.

## Available actions still exist even when not listed

The Prompt sentence guarantees a valid next move on every day:
- Morning: set price, buy ingredients, or wait.
- End of Day: continue.
- Ending: view final result (no further gameplay input).

## Response after failed validation

If the player sets a negative price or tries to buy ingredients
they cannot afford, the response replaces the Advisory / Recap
slot with a one-line failure reason; Day Header, Morning Report or
Recap, and Dashboard render the unchanged state. No retraction, no
double narrative.

## Response after commit

Both responses are generated after State Commit. Morning is
generated after Pre events (Weather Roll, Rain, Heat Wave) commit;
End of Day is generated after Simulation and Post events (Festival,
Supply Shortage) commit. The response never edits state; if a Post
event fired Festival, the Recap and Dashboard reflect the
post-Festival Reputation and Money — never a pre-event intermediate.
