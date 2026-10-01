---
name: review-and-recommend
description: >
  Review data, issues, code, and git history; present options with effort and
  one-way/two-way door labels; recommend one path and name the right fix
  (explain if they differ). Use before implementing when a decision needs
  evidence-backed options, or when the user asks "what should we do about X".
---

# Review and recommend

1. Find the **core problem**. A user's suggested solution is a clue, not the
   spec. Restate the problem and who has it.
2. Check the **evidence**: query production data or analytics (see
   [instrumentation](../../../docs/contributing/instrumentation.md)) for how
   many users hit this and how often. Say so when no data exists.
3. Review the relevant code, docs, decision records, issues, and git history.
   Check [decisions/index.md](../../../docs/contributing/decisions/index.md)
   first — do not re-propose a recorded "no" unless its revisit-if is met.
4. Present real options, numbered, each with effort (`Easy` · `Medium` · `Hard`)
   and a **one-way door** (hard to reverse) or **two-way door** (reversible)
   label. Note when a feature flag would turn a one-way door into a two-way
   door.
5. Make a **recommendation**.
6. Name the **right fix**. If it differs from the recommendation (for example,
   the right fix is too costly right now), explain why.
7. Stop and wait for a choice. Do not implement.
