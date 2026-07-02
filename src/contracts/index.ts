/**
 * Contract Layer catalog — PRD-006, PRD-007, and the presentation half
 * of PRD-004 §15.
 *
 * Runtime behavior (PRD-004) is fixed for every MGR game. How the
 * runtime presents its work — the UI layout, the state serialization,
 * the response envelope — is a separate concern. Runtime is one; the
 * contracts are pluggable per genre. A tycoon dashboard and an
 * interactive-fiction dialog surface should not share the same
 * Markdown body just because both are compiled by MGR.
 *
 * The Bundler injects the default contract bodies below into every
 * build so a project without customization still ships a complete
 * specification. When the author writes `@section ui-contract` in
 * their sources, their body replaces the default entirely — the
 * game-agnostic invariants (UI is a view of state, output follows
 * commit, state is the single source of truth) live in the runtime
 * layer and are never overridable.
 *
 * PRD-004 §18 lists UI and State Schema as explicit non-goals of the
 * Runtime Specification; this module is where that split becomes
 * concrete. See PRD-006 for the State Contract, PRD-007 for the UI
 * Contract, and PRD-004 §15 for the fixed five-part response order.
 */

/** Bumped when a Contract Layer body changes shape or wording. */
export const CONTRACT_SPEC_VERSION = "1.0";

export interface ContractSectionDef {
  /** Canonical section id (matches PSF §11). */
  id: string;
  /** Rendered body, used verbatim inside the section boundary. */
  body: string;
}

const UI_CONTRACT_BODY = `The UI is a view of the state. It carries no logic. It does not
change state. It only reflects the current state.

Every turn renders the same layout, in this fixed order:

1. Narrative — what just happened.
2. Events — named events with a short effect summary, only when the
   turn produced any.
3. Dashboard — the most important information for the player. Always
   present. Its contents (money, health, energy, population, date,
   ...) are chosen by the game package; its position never moves.
4. Details — expanded panels (inventory, research, projects, army,
   relationships). Shown only when relevant.
5. Available Actions — a numbered list of actions the player can
   take. Always present. The player is not forced to choose from the
   list, but the runtime must always provide one.
6. Prompt — an invitation to submit the next action. The runtime
   never plays the next turn on its own.
7. State Snapshot — the current state serialized per the State
   Contract. Present on every turn to support save, load, replay, and
   debug. The snapshot is not narrative.

Narrative rules.
- Short and to the point.
- Consistent with the rules.
- Never leaks hidden state.
- Contains no UI markup.

Markdown allowlist.
Use standard Markdown only: headings, tables, lists, blockquotes,
bold, italic, horizontal rules, code blocks. Do not use HTML. Do not
depend on CSS. The output must render on any Markdown surface.

Stable layout.
The layout is stable across turns. Turn 1 and turn 500 place the
dashboard in the same slot, the action menu in the same slot, the
snapshot in the same slot.

Adaptive detail.
The runtime may show or hide detail panels as the game evolves —
early game may render only the dashboard; late game may add a
project panel. Only the content changes; the layout does not.

Hidden information.
Hidden state is never rendered. When a rule requires the runtime to
acknowledge that hidden information exists, use \`???\` or
\`Unknown\`. Never reveal the real value.

Error UI.
If an action fails, the layout does not change. The narrative slot
carries the error explanation instead of a success story; the
dashboard, the action menu, and the state snapshot still render.

Accessibility.
- Easy to read.
- Clear spacing.
- Consistent headings.
- Simple tables.
- No overreliance on symbols.
- No dependency on color.
- No dependency on emoji. Emoji is a game-package option, not a
  contract requirement.

Renderer independence.
The UI Contract describes structure, not rendering. Do not assume a
font, a theme, dark mode, mobile, or desktop. Markdown must work
everywhere.

UI invariants every turn:
- Narrative is present.
- Dashboard is present.
- Available Actions is present.
- Prompt is present.
- State Snapshot is present.
- No hidden state is rendered.
- The layout does not change.

Contract customization.
This body is the default MGR ships. A game package may replace it
with its own \`@section ui-contract\` — for example a card game may
render Hand / Board / Opponent, a visual novel may render Dialog /
Choices. The invariants above (UI is a view of state, UI never
mutates state, no HTML, no hidden state) are runtime-level and hold
regardless of which layout the game chooses.`;

const STATE_CONTRACT_BODY = `State is the single source of truth for this game. Every runtime
decision derives from state. If a fact is not written in state or
implied by a rule, it does not exist for the runtime.

State is organized into domains. A game may declare any number of
them. Typical domains include:
- Player
- World
- NPC
- Resources
- Inventory
- Flags
- Variables
- Timers
- Relationships
- Quest
- History

Building blocks.
- Entity. Any object in state is an entity. Every entity has a
  unique identifier within the game. Players, companies, employees,
  factories, items, monsters — all entities.
- Property. Entities carry properties (money, level, health,
  position, status, skill). The runtime changes properties. It does
  not change the shape of an entity mid-play unless a rule permits.
- Collection. State supports collections (employees, inventory,
  cities, projects, quests). Collections may add, remove, or update
  items through rules.
- Flag. Flags are boolean — tutorial-completed, door-opened,
  game-finished. Flags always resolve to true or false.
- Variable. Variables hold single scalar values (money, score,
  year, temperature, population). The runtime does not create new
  variables mid-play unless the game package declared them.
- Relationship. State supports relationships between entities
  (player → guild → members; company → employees). Relationships are
  part of state.

Persistent and transient entities.
Entities come in two kinds:
- Persistent — live in the snapshot, survive across turns. Default.
- Transient — live only inside one Turn or one Phase. Never enter
  the snapshot, never appear in turn history. A game declares
  transient entities with a Kind and a Lifetime, for example
  "Kind: Transient, Lifetime: Simulation Phase". The runtime creates
  them when a rule requires and discards them when the lifetime ends.

Public, private, and hidden state.
State has three visibility levels, declared per variable, property,
or collection:
- Public — always visible to the player. Rendered in the dashboard
  and in the state snapshot.
- Private — used by the runtime, disclosed only when a rule allows.
  Not rendered by default.
- Hidden — never revealed directly. Used for AI strategy, future
  events, secret values, unexplored map. Rendered as \`???\` or
  \`Unknown\` when a rule forces the runtime to acknowledge it.

The game package declares visibility. The runtime does not guess.
If a value is not labeled, treat it as Public and emit a warning in
turn history.

Mutation.
State only changes at the State Commit step of the turn lifecycle.
Narrative, UI, validation, and rendering never mutate state. Every
mutation flows through the turn loop.

Validation.
After every commit the runtime verifies that entities, collections,
variables, and relationships are well-formed, and that no fact
contradicts another. If validation fails, the commit is discarded.

Invariants.
A game package may declare invariants such as \`Money >= 0\`,
\`Population >= 0\`, \`HP <= MaxHP\`. The runtime maintains every
declared invariant on every turn.

Derived state.
Some values can be computed from other state (net worth, average
salary, combat power). Do not store derived values that can be
recomputed. Compute them on demand.

Queries and selectors.
Rules and formulas may query collections through pure selectors:
\`Collection where Predicate\`, \`Sum(Collection, Property)\`, \`Any(...)\`,
\`First(... order by ...)\`. Selectors read state; they never mutate
it. A selector reads the same snapshot the surrounding rule reads —
never a partially-committed value. When a selector's collection is
empty, the caller must handle the empty result explicitly; the
runtime never picks a default.

State history.
State history follows turns: turn 1 → turn 2 → turn 3 → turn 4.
History is read-only. Never edit a past turn's snapshot.

Serialization.
State is represented in Markdown. The builder and the runtime share
one convention: human-readable, easy to debug, easy to inspect,
platform-independent. Prompt specifications never rely on JSON.

Ownership.
Only the runtime may create, modify, or delete state. The player
only submits actions. The game package only declares the schema and
the rules.

Contract customization.
This body is the default MGR ships. A game package may replace it
with its own \`@section state-contract\` — for example a card game
may serialize Hand + Board + Deck instead of Player + World + NPC.
The runtime-level invariants (state is the single source of truth,
only the runtime mutates, no JSON in prompt specifications) hold
regardless of which schema the game chooses.`;

const OUTPUT_CONTRACT_BODY = `Every response follows this order:

1. Narrative — what happens in the world.
2. Game Effects — what the action produced.
3. Updated State — what the state now shows.
4. Available Actions — what the player can do next.
5. Await Player Input — hand control back to the player.

The UI Contract refines how each of these parts is rendered as
Markdown — headings, tables, dashboards, snapshot format. The
runtime ordering above is fixed; presentation details defer to the
UI Contract.

Contract customization.
This five-part order is the default MGR ships. A game package may
replace it with its own \`@section output-contract\` — for example a
card game may emit Card Played → Board → Opponent → Your Hand, a
detective may emit Transcript → Clues → Deductions. The
runtime-level invariants (response follows commit, response never
mutates state, at least one available action per turn) hold
regardless of which shape the game chooses.`;

/** PRD-006, PRD-007, and PRD-004 §15 — canonical Contract Layer bodies. */
export const CONTRACT_SECTIONS: readonly ContractSectionDef[] = [
  { id: "ui-contract", body: UI_CONTRACT_BODY },
  { id: "state-contract", body: STATE_CONTRACT_BODY },
  { id: "output-contract", body: OUTPUT_CONTRACT_BODY },
];

const CONTRACT_MAP: ReadonlyMap<string, string> = new Map(
  CONTRACT_SECTIONS.map((s) => [s.id, s.body]),
);

const CONTRACT_IDS: ReadonlySet<string> = new Set(
  CONTRACT_SECTIONS.map((s) => s.id),
);

/** True when `id` is one of the Contract Layer sections MGR injects. */
export function isContractSection(id: string): boolean {
  return CONTRACT_IDS.has(id);
}

/** Canonical body for a Contract Layer section, or undefined. */
export function contractSectionBody(id: string): string | undefined {
  return CONTRACT_MAP.get(id);
}
