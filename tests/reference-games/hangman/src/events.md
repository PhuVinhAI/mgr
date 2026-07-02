@section events

<!-- PRD-008 §9 Events + PRD-008 §15a.5 Section Schema +
     PRD-005 v1.1 §7 Pre Event / §7a Post Event +
     PRD-014 §5.5 Documentation. -->

## Pre Events

<!-- Hangman does not need Pre Events — Word is set once in start.md
     and Mask is derived from Word. Environment does not change per
     Turn. Kept as a placeholder for future variants (timed rounds,
     word-length hints). -->

## Post Events

<!-- End-condition Rules are Trigger Rules that fire On Post Event
     (see rules.md::CheckWin and CheckLose). No explicit Event
     declarations are needed for this game — the trigger context is
     the Post Event Phase itself. -->

## Event ordering

Within a Turn, the queue runs in this fixed order:

Pre Event Queue:
(empty)

Simulation runs — Guess Letter / Guess Word / Give Up Rules apply.

Post Event Queue:
1. CheckWin trigger
2. CheckLose trigger

Commit.

<!-- No Event declarations means no §15a.5 blocks in this file — the
     file is documentation-only. PRD-008 §15a.9 permits doc-only .md
     that is imported for narrative coherence. -->
