# Shipping policy

The owner sets this policy; agents follow it and never widen it on their own.
Edit the **Authority** table to change what agents may do.

## Risk levels

Agents assess risk from the diff and the primitives it touches
(`npx harness classify`), then judge `composes` vs `extends` themselves.

| Risk       | Typical shape                                                                |
| ---------- | ---------------------------------------------------------------------------- |
| **Low**    | `composes`: wiring, copy, docs, tests, isolated fixes                        |
| **Medium** | `extends`: changes a primitive's behavior or contract; several files         |
| **High**   | `adds` a primitive, migrations, auth, money, data deletion, any one-way door |

A diff that touches a primitive's `invariants` is at least medium.

## Authority

| Action                | Low        | Medium     | High       |
| --------------------- | ---------- | ---------- | ---------- |
| Local commit          | when asked | when asked | when asked |
| Push branch / open PR | ask        | ask        | ask        |
| Merge                 | ask        | ask        | owner only |
| Deploy                | ask        | ask        | owner only |

"Ask" means stop with everything ready and say exactly which command the owner
should run. Raise authority per row as trust in the harness grows (for example,
"Low: merge when CI green").

## Review requirements

- **Low:** green `validate`.
- **Medium:** green `validate`, independent review (the AI reviewers installed
  on the repo plus one fresh-context sub-agent), valid feedback addressed, and
  `verify-app` evidence against the running app.
- **High:** all of the above plus a written rollback plan in the PR. If the
  change is a one-way door with no cheap rollback, say so; that is the trigger
  for feature flags in [growth.md](./growth.md).
