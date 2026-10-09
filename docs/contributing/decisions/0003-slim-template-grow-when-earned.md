# 0003: Slim template; add tooling when it earns its place

- **Status:** accepted
- **Date:** 2026-10-09

## Context

The first cut of this template carried most of kody's apparatus before any
product existed: seven scheduled routines, feature flags, a Feature Map CLI,
fourteen `validate` lanes, and a dozen docs about environments the template does
not have. kody needs those because it is a large product built by agent fleets.
The template's own rule, encode a guardrail when a mistake repeats, argues
against installing them in advance.

## Decision

The template ships the loop: a short map, the contributor docs, one gate, the
guard hooks, the shipping policy, four skills, and four checkers. Everything
else is listed in [growth.md](../growth.md) with the trigger that justifies it,
and is added only in a PR that names the trigger that fired.

## Consequences

`validate` stays under 30 seconds and the whole harness can be read in one
sitting. Some mistakes will happen once before a guardrail exists; that is the
price of knowing which guardrails matter. Revisit if three growth triggers fire
within a month, which suggests the product has outgrown the slim profile and a
bundle should be adopted together.
