# Feature Map

A searchable map of user-facing surfaces, so agents find and drive the right
route instead of rediscovering it from source.

`src/features.ts` is the machine-readable catalog. Each feature has one doc here
named `<id>.md`. `npm run features:check` fails when a route is missing from the
catalog, a catalog path has no route, or a feature has no doc.

## App CLI

```bash
npm run app -- doctor                           # environment sanity
npm run app -- dev                              # start or reuse the dev server
npm run app -- map [query]                      # list features
npm run app -- flags                            # list flags, audiences, removal conditions
npm run app -- request GET /health              # status + body
npm run app -- request GET / --contains 'Replace' --dump
npm run app -- health --sha <git-sha> [--origin https://prod.example]
```

`--dump` writes the raw body to `.tmp/app-cli-body`. `--contains` fails unless
the substring is present. Extend the CLI (auth, seeding, preview origins)
instead of writing throwaway scripts.

## Features

- [home](./home.md) — `/`
- [health](./health.md) — `/health`
