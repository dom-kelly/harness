# 0004: The harness is a CLI package; products depend on it

- **Status:** accepted
- **Date:** 2026-10-09

## Context

As a template, the harness could only be copied: every product got a snapshot,
fixes had to be re-applied by hand in each repo, and improvements made while
building one product never reached the others. kody avoids the problem by being
one repo; with several products that is not an option.

## Decision

This repo is an npm package with a CLI. `harness new` scaffolds a product and
`harness adopt` applies the harness to an existing repo; both record what they
wrote in `.harness/base/`. `harness sync` brings managed files up to the current
templates with a three-way merge, so local edits survive. The engine (checkers,
classifier, hooks, later the merge policy) is never copied into a product;
products call `npx harness …`.

Files fall into three kinds, listed in `templates/manifest.json`:

- **managed** — written by new/adopt, kept in step by sync;
- **owned** — written once if absent, then the product's (intent, primitives,
  decisions, gotchas, security, services);
- the **engine** — in this package only.

Product tooling (test runner, typechecker, build) stays the product's; the
harness only owns its checks, hooks, templates and policy.

The harness repo's own `docs/contributing/` describes developing the harness.
The product-facing docs live under `templates/`; the two share an ancestor but
are different documents, and are not generated from each other.

## Consequences

Improving the harness means editing `templates/` or `src/` here and running
`npx harness sync` in each product. The repo stays private, so a product's CI
needs read access to install it (a fine-grained token, or make the repo public).
Revisit if the three-way merge produces conflicts on most syncs, which would
mean managed files carry too much product-specific text.
