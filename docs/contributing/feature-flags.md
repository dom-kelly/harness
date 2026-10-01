# Feature flags

Flags are the main safety net for shipping agent-written code without reading
every line. A flag turns a one-way door into a two-way door: if a change
misbehaves, set its audience to `off` and nobody experiences it while you fix
forward or revert.

## Shape

Flags live in `src/flags.ts`. Each declares:

- `description` — what the flag gates.
- `audience` — `off`, `experiments` (users who opted into experiments), or
  `everyone`.
- `successMetric` — how you will know the flagged behavior works (an event
  count, an error rate, a user outcome). Widening the audience needs this
  evidence.
- `removeWhen` — the falsifiable condition for deleting the flag (enforced by
  the type) and the `flags-declare-removal` invariant.

Override an audience at runtime with `FLAG_<NAME>` (for example
`FLAG_FORK_UPDATES=experiments`). Replace the env override with your real config
store (database row, KV, admin UI) when the product has one.

## When to flag

- **Medium risk and above** ships behind a flag at `experiments` by default.
- One-way doors (new primitives, data shape changes) ship behind a flag until
  the [shipping policy](./shipping-policy.md) owner widens the audience.
- Low-risk copy, docs, and fixes do not need a flag.

## Rollout

1. Merge with the flag at `off` or `experiments`.
2. Verify with `verify-app` as an opted-in subject.
3. Widen to `everyone` once the evidence is good.
4. When `removeWhen` is met, delete the flag and the dead branch in the same
   change. Until then a `Cleanup:` issue tracks it (see
   [cleanup-after-migrations.md](./cleanup-after-migrations.md)); the legacy
   reaper routine checks these.

Users need a visible way to opt into experiments (an account setting) so the
`experiments` audience means something.
