# Cleanup after migrations

Transitional leftovers (dual writes, shims, compatibility aliases, feature
flags, deprecated routes, old columns) must not become permanent cruft.

1. **Remove it in the same change** when that is safe.
2. Otherwise **open a GitHub issue** titled
   `Cleanup: <what to remove> after <gate>`, labelled `improvement`, and link it
   from the PR that introduced the leftover.

A runbook line or a `TODO` is not a tracker. The issue is.

Issue body:

```markdown
## Leftover

What to delete or stop serving.

## Why it waits

The gate (second deploy, soak, data backfill, client rollout).

## Ready when

A falsifiable criterion, not a calendar date alone.

## How to verify

Commands, queries, or deploy evidence.

## Introduced by

The PR that added the leftover.
```

Close the issue when the cleanup lands.
