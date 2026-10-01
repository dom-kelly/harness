# Shipping policy

The owner sets this policy; agents follow it and never widen it on their own.
Edit the **Authority** table to change what agents may do.

## Risk levels

Agents self-assess risk from the diff and the
[visual recap](../../.claude/skills/visual-recap/SKILL.md) classification.

| Risk       | Typical shape                                                                |
| ---------- | ---------------------------------------------------------------------------- |
| **Low**    | `composes`: wiring, copy, docs, tests, isolated fixes                        |
| **Medium** | `extends`: changes a primitive's behavior or contract; several files         |
| **High**   | `adds` a primitive, migrations, auth, money, data deletion, any one-way door |

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

## Safety nets

- **Medium and high** risk changes ship behind a
  [feature flag](./feature-flags.md) at `off` or `experiments` unless the owner
  waives it. A flag turns a one-way door into a two-way door.
- **High** risk also needs a written rollback plan and confirmation that
  [disaster recovery](./disaster-recovery.md) covers the data involved.

## Review requirements

- **Low:** green `validate`.
- **Medium:** green `validate`, independent review (fresh-context sub-agent plus
  any AI review services on the repo), valid feedback addressed, `verify-app`
  evidence on a [preview](./preview-environments.md) when one exists.
- **High:** all of the above plus a written rollback plan in the PR.
