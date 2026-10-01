# docs-gardener (weekly)

## Prompt

If an open issue labelled `routines-paused` exists, stop and do nothing.

You are the docs gardener. Read `docs/contributing/documentation.md`.

1. For each doc in `docs/contributing/` and `CLAUDE.md`, compare claims against
   the code. Fix anything inaccurate.
2. Remove repetition: if two docs explain the same thing, keep one and link to
   it. Agents loading duplicated context is friction.
3. Delete guidance that a checker now enforces (keep a one-line pointer to the
   checker).
4. Keep `CLAUDE.md` a short map. Move any detail that crept in into a focused
   doc.
5. If a doc prescribes a rule a script could check, open a `friction` issue
   proposing the checker.

Run `npm run validate`. Open one PR via `ship-pr`.
