# harness-boilerplate

A starting point for building any product with AI coding agents. The app in
`src/` is a placeholder; the value is the **harness** around it: the docs
layout, skills, and mechanical checks that keep agent-written code steerable as
the product grows.

The approach is adapted from the agent workflow in
[kentcdodds/kody](https://github.com/kentcdodds/kody) and OpenAI's
[harness engineering](https://openai.com/index/harness-engineering/) write-up.

## Start a new product

```bash
git clone <this repo> my-product && cd my-product
rm -rf .git && git init
npm install
npm run validate
```

Then ask your agent to run the **`new-product`** skill with your idea. It fills
the project intent, shapes the primitives map, records the first decisions,
helps pick a stack, and plans the first vertical slices.

## What is in the box

| Layer             | Where                                            | Purpose                                                                        |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Map               | `CLAUDE.md`, `AGENTS.md`                         | Short index; detail lives in focused docs                                      |
| Docs              | `docs/contributing/`                             | Intent, harness loop, shipping policy, style, testing                          |
| Veto list         | `docs/contributing/decisions/`                   | Recorded "no" decisions so agents stop re-proposing them                       |
| Taxonomy          | `docs/contributing/architecture/primitives.yaml` | Building blocks; every source file has an owner                                |
| Feature Map + CLI | `src/features.ts`, `tools/app-cli.ts`            | Drive and verify the real app instead of ad-hoc scripts                        |
| Skills            | `.claude/skills/`                                | new-product, review-and-recommend, orchestrate, ship-pr, …                     |
| Routines          | `.claude/routines/`                              | Scheduled agents: friction sweep, test/docs gardeners, legacy reaper, audits   |
| Feature flags     | `src/flags.ts`                                   | Ship medium+ risk behind `off`/`experiments`; every flag declares `removeWhen` |
| Gate              | `npm run validate`                               | One local gate, identical in CI                                                |
| Checkers          | `tools/check-*.ts`                               | Docs tense, decision numbers, links, skills, ratchets, banners                 |
| Hooks             | `.husky/`                                        | Format on commit; typecheck/tests skipped for docs-only diffs                  |

## The core idea

When an agent makes the same mistake twice, encode the fix in the strongest
cheap guardrail: lint/type/checker → test → script → doc (last). See
[harness-engineering.md](./docs/contributing/harness-engineering.md).
