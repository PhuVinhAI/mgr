/**
 * Prompt Specification Format catalog — PRD-003.
 *
 * PSF fixes the shape of the compiler's output so every project ends
 * up as the same kind of specification document, regardless of game.
 * §11 pins the section order; §12 gives each section an internal id
 * that the Builder uses to sort, merge, validate and (later) override.
 * The catalog below is the single source of truth for that mapping.
 *
 * Non-canonical section ids are still valid — they are emitted after
 * the canonical spine in appearance order (§11 is a lower bound, not
 * a whitelist). This keeps games free to add local subsections while
 * preserving the stable ordering LLMs and humans navigate by.
 */

/** Bumped when the PSF envelope changes shape. */
export const PSF_SPEC_VERSION = "1.1";

export interface PsfSectionDef {
  /** Internal id — the string a user writes after `@section`. */
  id: string;
  /** Display heading rendered in output (uppercase, spaces). */
  title: string;
}

/** PRD-003 §11 — the fixed section order. */
export const PSF_SECTIONS: readonly PsfSectionDef[] = [
  { id: "system", title: "SYSTEM" },
  { id: "identity", title: "IDENTITY" },
  { id: "mission", title: "MISSION" },
  { id: "global-constraints", title: "GLOBAL CONSTRAINTS" },
  { id: "runtime", title: "RUNTIME" },
  { id: "turn-loop", title: "TURN LOOP" },
  { id: "state-machine", title: "STATE MACHINE" },
  { id: "memory-model", title: "MEMORY MODEL" },
  { id: "validation", title: "VALIDATION" },
  { id: "ui-contract", title: "UI CONTRACT" },
  { id: "state-contract", title: "STATE CONTRACT" },
  { id: "game", title: "GAME" },
  { id: "world", title: "WORLD" },
  { id: "entities", title: "ENTITIES" },
  { id: "rules", title: "RULES" },
  { id: "events", title: "EVENTS" },
  { id: "start-state", title: "START STATE" },
  { id: "output-contract", title: "OUTPUT CONTRACT" },
  { id: "first-turn", title: "FIRST TURN" },
];

const CANONICAL_RANK: ReadonlyMap<string, number> = new Map(
  PSF_SECTIONS.map((s, i) => [s.id, i]),
);

/**
 * Normalize an id to canonical shape. `_` and `-` are treated as the
 * same separator so `state_machine`, `state-machine`, `StateMachine`
 * all collapse to `state-machine`.
 */
export function canonicalizeSectionId(id: string): string {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/_/g, "-");
}

/** Canonical rank per §11, or -1 if the id is a custom section. */
export function psfSectionRank(id: string): number {
  return CANONICAL_RANK.get(canonicalizeSectionId(id)) ?? -1;
}

/**
 * Display title for a section id. Canonical ids resolve to their
 * PSF-mandated heading; custom ids get an uppercase transliteration
 * so the output remains visually consistent (§15 Prompt Boundary).
 */
export function psfSectionTitle(id: string): string {
  const rank = psfSectionRank(id);
  if (rank >= 0) return PSF_SECTIONS[rank]!.title;
  return canonicalizeSectionId(id).replace(/-/g, " ").toUpperCase();
}
