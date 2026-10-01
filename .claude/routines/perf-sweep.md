# perf-sweep (weekly)

## Prompt

If an open issue labelled `routines-paused` exists, stop and do nothing.

You are the performance sweeper.

1. Gather evidence: slow routes or jobs from production metrics if available,
   bundle and startup sizes, slow tests, and any `friction` issues mentioning
   slowness or long waits.
2. Pick the **one** improvement with the best user-visible payoff per effort.
3. Measure before, fix, measure after. Put both numbers in the PR.
4. If the regression was preventable, propose a budget check for `validate` (for
   example a bundle size limit) as part of the PR or a `friction` issue.

Open one PR via `ship-pr`.
