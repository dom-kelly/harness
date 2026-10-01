# Maintenance routines

Scheduled agents that keep the repo healthy so the owner does not have to.
Agents work around pain instead of complaining about it, and they rarely delete
code. These routines push the other way.

Each file is a self-contained prompt. Schedule one with Claude Code's
`/schedule` (cloud routine) or any cron that starts an agent on this repo, and
paste the file's **Prompt** section. Every routine obeys the
[shipping policy](../../docs/contributing/shipping-policy.md): it opens PRs or
issues, and only merges when the policy allows.

| Routine                                 | Cadence                | Job                                                           |
| --------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| [friction-sweep](./friction-sweep.md)   | Daily                  | Fix, park, or close open `friction` issues                    |
| [test-gardener](./test-gardener.md)     | Nightly                | Bring tests back in line with the testing principles          |
| [docs-gardener](./docs-gardener.md)     | Weekly                 | Keep docs accurate, short, and free of repetition             |
| [legacy-reaper](./legacy-reaper.md)     | Weekly                 | Delete legacy code, flags, and fallbacks; instrument the rest |
| [perf-sweep](./perf-sweep.md)           | Weekly                 | Find and fix one meaningful performance problem               |
| [skill-trim](./skill-trim.md)           | Monthly                | Shrink skills; move repeatable steps into scripts             |
| [new-model-audit](./new-model-audit.md) | Each new model release | Full audit: security, a11y, architecture, maintainability     |

## Pause switch

Every routine starts by checking for an open issue labelled `routines-paused`
(`gh issue list --label routines-paused --state open`). If one exists, the
routine stops immediately and does nothing. Open such an issue to pause all
routines (for example during an incident or a migration freeze); close it to
resume.

Each run ends with a short summary: what changed, links, what it cost (if the
platform reports it), and anything that needs a human decision.
