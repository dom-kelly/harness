# Agent index

<!-- Replace this line with one sentence on what the product is. Keep the full
intent in docs/contributing/project-intent.md. -->

`npm run validate` is the single authoritative local gate. CI runs the same
checks, so green locally means green in CI.

This file is a map, not an encyclopedia. Open the doc you need; do not read them
all up front.

- Project intent, scope, and non-goals:
  [docs/contributing/project-intent.md](./docs/contributing/project-intent.md)
- Decision records (steering veto list — open before proposing a new primitive,
  surface, dependency, or storage home):
  [docs/contributing/decisions/index.md](./docs/contributing/decisions/index.md)
- How this harness works and how to grow it:
  [harness-engineering.md](./docs/contributing/harness-engineering.md),
  [growth.md](./docs/contributing/growth.md)
- Shipping policy (risk levels; who may push, merge, deploy):
  [shipping-policy.md](./docs/contributing/shipping-policy.md)
- Security invariants and accepted risks (read before touching auth, data, or
  secrets): [security.md](./docs/contributing/security.md)
- Architecture and the primitives taxonomy:
  [architecture/index.md](./docs/contributing/architecture/index.md)
- Known traps — add a line when an agent gets something wrong:
  [gotchas.md](./docs/contributing/gotchas.md)
- Contributor docs map (setup, services, style, testing, docs principles):
  [docs/contributing/index.md](./docs/contributing/index.md)

## Skills

Workflows live in `.claude/skills/`. Use them by name:

- `new-product` — turn a product idea into intent, primitives, decisions, and
  the first vertical slices.
- `review-and-recommend` — options with effort and one-way/two-way door labels,
  a recommendation, then stop.
- `ship-pr` — shepherd a change through validate, review, and CI to done.
- `verify-app` — prove a change against the running app and record evidence.
