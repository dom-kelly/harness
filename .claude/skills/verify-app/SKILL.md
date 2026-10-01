---
name: verify-app
description: >
  Prove a change works against the running app using the app CLI and the Feature
  Map instead of ad-hoc curl scripts. Use after changing routes, UI, APIs, or
  deploy behavior, or when the user asks to run, check, or verify the app.
---

# Verify app

Docs: [Feature Map and app CLI](../../../docs/contributing/features/README.md).

1. `npm run app -- doctor`, then `npm run app -- dev` (starts or reuses).
2. Find the surface: `npm run app -- map <query>`. Read that one feature doc.
3. Drive it: `npm run app -- request <METHOD> <path> --contains '<text>'`.
   Assert on content, not only status.
4. For browser UI, use browser automation against the printed origin and
   exercise the changed flow with realistic data.
5. After deploy (when policy allows):
   `npm run app -- health --origin <url> --sha <merge-sha>`.
6. Record what you ran and saw in the PR Testing section.

If you need a capability the CLI lacks (login, seeding, a preview origin), add
it to `tools/app-cli.ts` with a test rather than writing a throwaway script. New
routes need a `src/features.ts` entry and a feature doc
(`npm run features:check`).
