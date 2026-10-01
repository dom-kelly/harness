---
name: orchestrate
description: >
  Orchestrate sub-agents for large tasks: plan, delegate implementation to
  cheaper/faster models, parallelize only non-conflicting work, keep reviews
  lean, and do final QA yourself. Use when acting as an orchestrator or writing
  a kickoff for one. Prefer a single implementer when fan-out does not clearly
  pay.
---

# Orchestrate

See
[decision 0002](../../../docs/contributing/decisions/0002-no-default-orchestration.md):
one implementer is the default.

## Defaults

- **Prefer implement.** Fan out only when non-conflicting workstreams clearly
  beat one implementer. Sequential slices go to one implementer.
- **Partition by file ownership, not theme.** Shared files are serialized. Use
  git worktrees (`isolation: "worktree"`) when slices touch the same tree.
- **Model split.** The strongest model plans and integrates; a faster model (for
  example Sonnet or Haiku) does mechanical implementation and sweeps.
- **No orchestration theater.** No review → recheck → final-review chains per
  slice. One independent review for the whole change before merge.
- **Targeted tests while iterating;** `npm run validate` once before review.
- **You do final QA.** Never report done from sub-agent claims; re-run the
  checks and read the diff.
- **Do not poll.** Background agents notify on completion. For time gates,
  schedule a wake-up instead of sleeping.

## When fan-out pays

- One implementer per independent vertical slice.
- Cheap parallel sweeps (rename, lint fixups, test backfill per module).
- Audit → prioritized list → parallel cleanup agents.
- One independent "hard-to-reverse / security / perf" review before merge.

## Kickoff for each sub-agent

Self-contained and short:

- Goal and falsifiable done check (a command or observable behavior).
- Files it owns, and what siblings own (out of scope).
- Constraints: [shipping policy](../../../docs/contributing/shipping-policy.md),
  no new primitives without saying so, docs updated in the same change.
- Report format: STATUS (done / partial / blocked), files changed, commands run
  with results, open questions.
