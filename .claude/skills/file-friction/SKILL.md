---
name: file-friction
description: >
  File durable, recurring harness papercuts (misleading docs, lying types, flaky
  or missing checks, awkward commands) as GitHub friction issues so the next
  agent benefits. Use at the end of a session or ship-pr run, or when the user
  says "log that friction".
---

# File friction

Policy and bar: [friction-log.md](../../../docs/contributing/friction-log.md).

1. List papercuts from this session that this change did not fix.
2. Drop anything one-off, session-specific, or speculative. If nothing is left,
   stop — do not invent papercuts.
3. Search: `gh issue list --label friction --search "<keywords>"`. Comment on a
   match instead of duplicating.
4. File each remaining item:

   ```bash
   gh issue create --label friction --title "Friction: <what hurt>" --body-file -
   ```

   Body: **What happened**, **What I wanted**, **How to reproduce**, **Cost**.
   No secrets.

5. If a papercut is mechanical, say which checker would prevent it — that is the
   preferred fix.
