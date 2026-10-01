# Harness engineering

This repository uses an agent-first workflow. Humans steer outcomes; agents
execute implementation. Human attention is the scarce resource, so every change
should leave the harness a little stronger, not only the product.

Background: OpenAI, "Harness engineering: leveraging Codex in an agent-first
world" (https://openai.com/index/harness-engineering/).

## Principles

- Repository-local knowledge is the source of truth. Knowledge that only lives
  in a chat thread or an agent's memory will be lost.
- [CLAUDE.md](../../CLAUDE.md) is a map. Detail lives in focused docs here.
- Small enforceable rules beat long fragile instructions.
- Boring, composable abstractions beat opaque magic.
- Done is falsifiable: a command, a test, or observable app behavior.

## The loop

Run this for every feature, fix, and refactor:

1. **Intent.** State the goal and acceptance criteria in the task or PR.
2. **Implement.** Smallest change that meets the criteria.
3. **Evaluate.** Targeted tests while iterating; `npm run validate` before
   review; `verify-app` when behavior is user-visible.
4. **Capture.** Write what you learned into docs, tests, or tooling in the same
   change.
5. **Promote.** If a mistake repeats, encode it (see the ladder below).

## Hard way → agent → software

Work moves through three stages:

1. **Do it the hard way first** (by hand, or by talking it through with an
   agent) until you understand what the work really is.
2. **Hand it to an agent** once you are doing the same thing repeatedly. Ask of
   everything you do: could an agent do this reliably?
3. **Turn the agent's repeatable steps into deterministic software** (a script,
   a checker, a package). Software is cheaper, faster, more reliable, and usable
   by any agent, not locked into one tool's memory or automations.

Agents do not feel pain, so they will not push work into stage 3 on their own.
The friction log and the routines below are how that pressure gets applied.

## The enforcement ladder

When a mistake repeats, encode it in the strongest cheap guardrail that works:

1. **Lint, types, or a `validate` checker** — when the violation is visible in
   the file without guessing. Put the _why_ and the fix in the error message.
2. **Tests** — when the failure is behavioral and a static rule would guess.
3. **Scripts** — when the workflow is multi-step and a command can own it.
4. **Docs** — last, and only when no cheap checker is possible. Point at the
   check or test that backs the doc.

Rule of thumb: if a reviewer makes the same comment twice, encode it.

## Checkers in `validate`

| Check                  | Catches                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `format:check`, `lint` | Formatting and correctness lint                                |
| `typecheck`, `test`    | Types and behavior                                             |
| `knip`                 | Dead files, exports, and dependencies                          |
| `docs:check-temporal`  | Changelog wording in docs that should describe the present     |
| `docs:check-decisions` | Duplicate or unindexed decision record numbers                 |
| `docs:check-mermaid`   | Mermaid diagrams that GitHub cannot render                     |
| `audit:prod`           | Production dependency vulnerabilities (moderate and above)     |
| `docs:check-links`     | Broken relative links in markdown                              |
| `skills:check`         | Skill frontmatter, description quality, and length             |
| `primitives:check`     | Unowned source files and stale paths in the primitives map     |
| `features:check`       | Routes missing from the Feature Map, or features with no doc   |
| `slop-ratchet:check`   | Oversized files (ratchet only tightens) and decorative banners |

Add a checker with a test in `tools/`, wire it into `validate`, and list it
here.

## Agent guardrails

`.claude/settings.json` applies to every Claude Code session in this repo:

- `git push` and `gh pr merge` always ask the owner.
- A PreToolUse hook (`tools/claude-hooks/guard-bash.ts`) blocks force-pushes,
  `--no-verify`, `git reset --hard`, and `git clean -f`, with a message saying
  what to do instead.
- A SessionStart hook runs `npm run app -- doctor` so every session starts with
  the environment's state and fix commands.

## Maintenance

Scheduled agents do the gardening:
[maintenance routines](../../.claude/routines/README.md) sweep friction, prune
tests and docs, reap legacy code, trim skills, chase performance, and audit the
codebase whenever a new model ships.

Track the size of the codebase with `npm run loc`. Agents add code readily and
delete it reluctantly; a falling number after a reaper run is a good sign.

## Roles and safety nets

- [Agent roles](./agent-roles.md) — product partner vs implementer vs reviewers;
  records live in the repo.
- [Feature flags](./feature-flags.md) — the main way to ship without reading
  every line.
- [Preview environments](./preview-environments.md) — verify against a real
  deployment with seeded data.
- [Instrumentation](./instrumentation.md) — data before decisions; errors that
  start fix agents.
- [Disaster recovery](./disaster-recovery.md) — tested, offsite backups.

## Cost

Report what each shipped change cost (tokens or dollars, when the platform
exposes it) and which model did the work. Cost alone never kills an idea; the
question is whether value clearly exceeds it. Lower the cost where you can, and
raise the value.
