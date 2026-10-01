# new-model-audit (each new model release)

## Prompt

If an open issue labelled `routines-paused` exists, stop and do nothing.

A new model is available. Audit the whole codebase with fresh eyes.

Run this audit with the new model, and when practical also in a second tool or
model family (for example Devin, Cursor, or another vendor's agent). Merge the
findings and mark which ones both runs found; agreement raises confidence, and
differences are worth a closer look.

1. Read `CLAUDE.md`, the project intent, the primitives map, and the decision
   records so the audit respects decisions already made.
2. Review for:
   - **Security** — auth and authorization gaps, injection, secrets handling,
     per-user data isolation, dependency risk.
   - **Accessibility** — semantic markup, keyboard paths, contrast, labels.
   - **Architecture** — primitives that overlap, invented second ways of doing
     the same thing, layering violations.
   - **Maintainability** — oversized modules, dead code, misleading names, weak
     tests.
3. Output a prioritized list. For each finding: evidence (file and line),
   impact, effort (Easy · Medium · Hard), one-way/two-way door.
4. Do not re-report the accepted residual risks listed in
   `docs/contributing/security.md`.
5. Do not fix anything in this run. Write the audit to
   `docs/audits/YYYY-MM-DD-<model>.md` in the shape described in
   `docs/audits/README.md`, open a PR with only that file, and open one issue
   titled `Audit: <model> <date>` linking it, so the owner can walk through the
   findings one at a time with an implementer.
