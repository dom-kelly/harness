---
name: ship-pr
description: >
  Shepherd a change to done: assess risk, put medium+ changes behind a flag, run
  validate, get independent fresh-context reviews, address valid feedback,
  verify on a preview, write the PR description with a visual recap, then
  push/merge/deploy only as far as the shipping policy allows. Use when a branch
  or PR needs to be taken to done.
---

# Ship PR

Authority comes from
[shipping-policy.md](../../../docs/contributing/shipping-policy.md). Never
exceed it. When the policy says "ask", stop with everything ready and give the
exact command for the owner to run.

## Loop

1. **Assess risk** from the diff using the visual-recap classification
   (`composes` low · `extends` medium · `adds` high). Invariants touched → at
   least medium.
2. **Flag it (medium+).** Gate new behavior behind a
   [feature flag](../../../docs/contributing/feature-flags.md) at `off` or
   `experiments` unless the owner waived it.
3. **Validate.** `npm run validate`. Fix failures. Do not weaken a check to
   pass; if a check is wrong, fix the checker with a test.
4. **Draft first.** If pushing is allowed, open the PR as a draft while
   iterating so CI does not run on every commit. Mark it ready only when
   validate is green locally.
5. **Review (medium+).** Wait for the AI reviewers (see **AI reviewers** below)
   and address valid feedback. Also spawn one fresh sub-agent with only the
   intent, the diff, and the relevant docs; never review your own work.
6. **Verify (user-visible changes).** Use `verify-app`, on the PR
   [preview](../../../docs/contributing/preview-environments.md) when one
   exists, as a seeded user opted into experiments. Record the evidence.
7. **Describe.** Fill the PR template: Intent, Why, Summary, Testing (commands
   and results), System changes (visual-recap block), flag name if any.
8. **Ship within policy.** Wait on CI for the current head SHA only; ignore
   results for superseded commits. If the branch becomes conflicting after
   green, rebase once and re-run; if still conflicting, stop and report.
9. **After merge/deploy (if allowed):**
   `npm run app -- health --origin <prod> --sha <merge-sha>`, then widen the
   flag audience only if the policy allows.

Repeat 3–8 until CI is green and valid review feedback is cleared.

## AI reviewers

Installed as GitHub Apps (listed in
[external-services.md](../../../docs/contributing/external-services.md)); they
need no files in the repo.

- **Cursor Bugbot** is the primary reviewer. Trigger it by commenting
  `bugbot run` on the PR, or enable automatic runs in the Cursor dashboard.
  Bugbot only reviews PRs whose author is the GitHub account linked to Cursor.
  If the author differs, no review will appear: do not wait, note it in the PR,
  and continue with CI and the other reviewers.
- **CodeRabbit** is optional. Wait for it only on **high** risk (or when the
  owner asks). If it is rate-limited, errored, or not installed, do not wait.
- Treat every review comment as a claim to verify. Fix valid findings; ignore
  insignificant nits, already-fixed items, and wrong claims, replying on the
  thread with the reason.

## Gates are not CI

A soak, calendar gate, or rollout window ends the run. Schedule a wake-up or
open a `Cleanup:` issue (see the `cleanup` skill); do not sleep-poll.

## Wrap-up

- Run `file-friction` for durable leftover papercuts, including any long waits
  or duplicated context you hit.
- Final summary to the owner:
  - a human headline of the change (not "ship repo#12");
  - risk, difficulty (Easy/Medium/Hard), status (Shipped / Ready / Blocked);
  - flag name and audience, if any;
  - model used and cost, **only** when the platform reports them;
  - what was verified, and links to PR and any deployed pages.

  Never invent URLs, costs, or model names.
