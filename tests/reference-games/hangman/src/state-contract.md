@section state-contract

<!-- Per-game State Contract. The MGR default state-contract describes
     a generic Entity / Property / Collection / Flag / Variable /
     Relationship model with dashboard-heavy serialization. Hangman
     has exactly two entities and no collections, so a smaller
     contract fits better. Runtime-level invariants (state is the
     single source of truth, only the runtime mutates state, no JSON
     in prompt specs) still hold via the runtime layer. -->

State for hangman is a fixed shape. Every runtime decision derives
from state; nothing else is authoritative.

Entities.
- Puzzle — one per session. Attributes: Word, Mask, MaxWrong.
  Word and MaxWrong are Hidden. Mask is Public and mirrors Word once
  GameOver fires.
- Player — one per session. Attributes: GuessedLetters, WrongGuesses.
  Both Public.

Variables outside the entities.
- GameOver: boolean, Public. True after any ending Rule fires.
- Won: boolean, Public. Meaningful only when GameOver is true.

No collections, no relationships, no timers. Turn history is kept by
the runtime per PRD-005; the game does not declare its own history.

Visibility summary.
- Public:  Mask, GuessedLetters, WrongGuesses, GameOver, Won.
- Hidden:  Word, MaxWrong.
- Private: none.

Any variable added to the game must declare a Visibility. Unlabeled
variables are treated as Public with a warning in turn history — see
the game's state.md.

Invariants.
- 0 <= WrongGuesses <= MaxWrong.
- MaxWrong = 6 for this game.
- GameOver in {true, false}.
- Won in {true, false}.
- Length(Mask) = Length(Word).
- Every character of Mask is either `_` or the corresponding
  character of Word.

Mutation.
State only changes at the State Commit step of the turn loop. The
Verdict/Word/Progress/Prompt UI slots never mutate state. Turn
history records the player's guess, the rule that fired, and the
resulting values of Mask, WrongGuesses, GameOver, Won.

Serialization.
Because the UI Contract omits the State Snapshot slot, hangman does
not emit a per-turn snapshot. Save/load, when introduced, will
serialize as:

```
Puzzle:
  Word: <literal>
  Mask: <literal>
  MaxWrong: <int>
Player:
  GuessedLetters: <letters, alphabetized>
  WrongGuesses: <int>
Flags:
  GameOver: <bool>
  Won: <bool>
```

Markdown key/value pairs; never JSON.

Ownership.
Only the runtime mutates state. Player input is a request; rules
decide the resulting values.
