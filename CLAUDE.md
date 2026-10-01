# Agent index

<!-- Replace this line with one sentence on what the product is. Keep the full
intent in docs/contributing/project-intent.md. -->

`npm run validate` is the single authoritative local gate. CI runs the same
checks, so green locally means green in CI.

This file is a map, not an encyclopedia. Detailed guidance lives in focused
docs. Open the one you need; do not read them all up front.

- Project intent, scope, and non-goals:
  [docs/contributing/project-intent.md](./docs/contributing/project-intent.md)
- Decision records (steering veto list — open before proposing a new primitive,
  surface, dependency, or storage home):
  [docs/contributing/decisions/index.md](./docs/contributing/decisions/index.md)
- How this harness works and how to improve it:
  [docs/contributing/harness-engineering.md](./docs/contributing/harness-engineering.md)
- Shipping policy (who may push, merge, deploy; risk levels):
  [docs/contributing/shipping-policy.md](./docs/contributing/shipping-policy.md)
- Security invariants and accepted risks (read before touching auth, data, or
  secrets): [security.md](./docs/contributing/security.md)
- External services and installed apps:
  [external-services.md](./docs/contributing/external-services.md)
- Contributor docs map (setup, style, testing, docs principles, friction):
  [docs/contributing/index.md](./docs/contributing/index.md)
- Architecture and the primitives taxonomy:
  [docs/contributing/architecture/index.md](./docs/contributing/architecture/index.md)
- Agent roles, feature flags, previews, instrumentation, disaster recovery:
  linked from
  [harness-engineering.md](./docs/contributing/harness-engineering.md#roles-and-safety-nets)
- Scheduled maintenance agents (friction sweep, test/docs gardeners, legacy
  reaper, audits): [.claude/routines/README.md](./.claude/routines/README.md)
- Feature Map and the app CLI (drive the real app; do not hand-roll curl):
  [docs/contributing/features/README.md](./docs/contributing/features/README.md)

## Skills

Workflows live in `.claude/skills/`. Use them by name:

- `new-product` — turn a product idea into intent, primitives, decisions, and
  the first vertical slices.
- `review-and-recommend` — options with effort and one-way/two-way door labels,
  a recommendation, then stop.
- `orchestrate` — fan work out to sub-agents only when it clearly pays.
- `ship-pr` — shepherd a change through validate, review, and CI to done.
- `visual-recap` — mermaid recap of what a diff touches, in the PR description.
- `verify-app` — prove a change against the running app.
- `cleanup` — remove transitional leftovers now, or track them.
- `file-friction` — record durable harness papercuts for the next agent.
