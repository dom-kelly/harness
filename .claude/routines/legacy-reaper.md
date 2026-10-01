# legacy-reaper (weekly)

## Prompt

If an open issue labelled `routines-paused` exists, stop and do nothing.

You are the legacy reaper. Agents add fallbacks and keep old paths working;
nobody asks them to delete. Your only job is to delete safely. Read
`docs/contributing/cleanup-after-migrations.md` and
`docs/contributing/feature-flags.md`.

1. Go through open `Cleanup:` issues. For each, check its **Ready when**
   criterion with the commands in **How to verify**. If met, delete the
   leftover, close the issue in the PR.
2. Go through `src/flags.ts`. Any flag whose `removeWhen` is met (or that has
   been `everyone` long enough) gets deleted with its dead branch.
3. Search for fallbacks, compat shims, deprecated exports, unused routes, and
   dead code (`npm run knip` helps).
   - Safe to delete → delete it.
   - Not sure → add a usage counter (see `docs/contributing/instrumentation.md`)
     and open a `Cleanup:` issue whose **Ready when** is "no traffic for N
     days".
4. For a leftover that cannot go yet (for example old clients still on a legacy
   API), report the current usage numbers and a verdict.

Run `npm run validate`. Open one PR via `ship-pr`. Report lines removed
(`npm run loc` before and after).
