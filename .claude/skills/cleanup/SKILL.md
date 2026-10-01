---
name: cleanup
description: >
  Remove transitional leftovers (shims, dual writes, compat aliases, feature
  flags, deprecated routes) after a migration or similar change, or track them
  as a Cleanup issue when they must wait on a gate. Use when introducing or
  finishing a migration, or when a change leaves a deprecated path behind.
---

# Cleanup

Policy:
[cleanup-after-migrations.md](../../../docs/contributing/cleanup-after-migrations.md).

1. **Do it now** when the leftover is safe to drop in this change.
2. **Track it** when it waits on a later deploy, soak, backfill, or rollout:
   search open `Cleanup:` issues first, then

   ```bash
   gh issue create --title "Cleanup: <what> after <gate>" --label improvement --body-file -
   ```

   using the body sections in the policy doc. Link it from the PR.

3. **Not sure it is safe?** Do not guess and do not keep a fallback forever. Add
   a usage counter on the old path (see
   [instrumentation](../../../docs/contributing/instrumentation.md)) and make
   the issue's **Ready when** "no traffic for N days". The weekly
   [legacy reaper](../../routines/legacy-reaper.md) checks these.
4. For a time gate, also schedule a wake-up to check the "ready when" criterion.

A `TODO` comment or runbook line is not a tracker.
