# harness-boilerplate

A starting point for building any product with AI coding agents. The app in
`src/` is a placeholder; the value is the **harness** around it: the docs
layout, skills, and mechanical checks that keep agent-written code steerable as
the product grows.

The approach is adapted from the agent workflow in
[kentcdodds/kody](https://github.com/kentcdodds/kody) and OpenAI's
[harness engineering](https://openai.com/index/harness-engineering/) write-up,
deliberately slimmed: it ships kody's **loop**, not kody's inventory.

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

| Layer       | Where                                            | Purpose                                                               |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Map         | `CLAUDE.md`, `AGENTS.md`                         | Short index; detail lives in focused docs                             |
| Docs        | `docs/contributing/`                             | Intent, harness loop, shipping policy, security, testing, gotchas     |
| Veto list   | `docs/contributing/decisions/`                   | Recorded "no" decisions so agents stop re-proposing them              |
| Taxonomy    | `docs/contributing/architecture/primitives.yaml` | Building blocks; every source file has an owner                       |
| Skills      | `.claude/skills/`                                | new-product, review-and-recommend, ship-pr, verify-app                |
| Gate        | `npm run validate`                               | One local gate, identical in CI                                       |
| Checkers    | `tools/check-*.ts`                               | Decision numbers, doc links, skills, primitives map                   |
| Hooks       | `.husky/`, `.claude/settings.json`               | Format on commit; docs-only diffs skip tests; destructive git blocked |
| Growth path | `docs/contributing/growth.md`                    | What to add, and when it has earned its place                         |

## The core idea

When an agent makes the same mistake twice, encode the fix in the strongest
cheap guardrail: lint/type/checker → test → script → doc (last). See
[harness-engineering.md](./docs/contributing/harness-engineering.md).

## Slim on purpose

kody runs routines, feature flags, previews and a dozen checkers because it is a
large product built by agent fleets. Those pieces are listed in
[growth.md](./docs/contributing/growth.md) with the trigger that justifies each
one, and are added only when the trigger fires
([decision 0003](./docs/contributing/decisions/0003-slim-template-grow-when-earned.md)).
Two tests of "slim enough": an agent can read the whole harness in one sitting,
and `validate` stays under 30 seconds.
