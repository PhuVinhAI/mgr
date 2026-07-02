@section ui-contract

<!-- Per-game UI Contract (PRD-007 §14 Adaptive Detail, PRD-008 §12
     Content vs Layout). The MGR default ui-contract is genre-neutral
     and lists Narrative / Events / Dashboard / Details / Actions /
     Prompt / State Snapshot. Lemonade is a day-based tycoon whose
     rhythm is Weather → Pricing decision → Simulation → End-of-Day
     Recap. This override reshapes the surface to that rhythm while
     preserving the runtime-level invariants (UI is a view of state,
     UI never mutates state, no HTML, no hidden state rendered). -->

The UI is a view of Stand + Weather + Money. It carries no logic and
never mutates state.

A "turn" here is a full day. Each day's response renders exactly
six slots, in this fixed order:

1. Day Header — `Day <n> of 20 — <Weather>`. Weather is the visible
   value (Sunny / Rainy / Heat Wave); it never leaks TodayTemperature
   or the hidden demand modifiers.
2. Morning Report — a two-line pre-simulation block visible before
   the player commits a Price:
   - Ingredients: `Lemons: <n> · Sugar: <n> · Ice: <n>`
   - Reputation: `Reputation: <n> / 100`
3. Dashboard — the two persistent economy variables that must be
   readable at a glance every day:
   - `Money: $<n>` (may be negative — see ending.md).
   - `Reputation: <n> / 100`
4. End-of-Day Recap — visible ONLY after Simulation commits. Four
   short lines, in this order:
   - `Customers served: <n> / <TodayDemand-visible>` — the
     customers-served number is the newly-revealed Customers
     variable (private until the recap). The demand it is served
     against is rendered as-committed; TodayDemand itself stays
     Hidden.
   - `Revenue: $<n>` — cups sold × Price.
   - `Ingredients used: <n> lemons · <n> sugar · <n> ice`.
   - `Reputation change: +<n>` or `-<n>` or `unchanged`.
5. Events — named events fired this day, one per line with a short
   effect summary. Suppressed when no player-visible event fired.
   Hidden pre-events (Weather Roll, Rain, Heat Wave) are NEVER
   listed here — they are part of Morning setup, not user-facing
   events.
6. Prompt — `Set today's price and inventory purchases, or type
   "wait" to skip.` at Morning; `Continue to day <n+1>?` at End of
   Day; the ending narrative at Day 20 / Money-out.

Suppressed slots.
The default numbered Available Actions list is omitted. Lemonade's
actions (Set Price, Buy Lemons, Buy Sugar, Buy Ice, Wait, End Day)
are surfaced through the Prompt sentence and the day's phase, not a
menu. The default State Snapshot slot is also omitted — save/load
uses the state-contract serialization below on demand, not every
turn.

Hidden information.
TodayDemand, TodayTemperature, FestivalChance, SupplyShortageChance
are Hidden and MUST NOT appear in any slot at any phase. Customers
is Private and appears only in the End-of-Day Recap.

Markdown allowlist.
Standard Markdown only; no HTML, no CSS. Numeric formatting uses
`$` for money and `/` for capped ratios; no emoji, no color.

Error UI.
On an invalid price or a purchase the player cannot afford, the
Prompt slot carries the reason; Day Header, Morning Report, and
Dashboard render the unchanged pre-turn state.

Lemonade UI invariants:
- Day Header is present every day.
- Dashboard is present every day.
- Prompt is present every day.
- Morning Report renders only at Morning phase.
- End-of-Day Recap renders only after Simulation commits.
- Events renders only when a public event fired.
- No hidden state is rendered.
- The six-slot layout is stable day 1 through day 20.
