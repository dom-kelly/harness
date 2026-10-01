# Getting started

Requires Node 22.18 or later (TypeScript runs natively; tools are plain `.ts`).

```bash
npm install          # also installs git hooks via husky
npm run app -- doctor
npm run app -- dev   # starts or reuses the dev server, prints its URL
npm run validate     # the single gate; read-only
npm run validate:fix # apply formatter and lint autofixes
```

## Agents

An agent setting up the repo does everything it can itself (install, doctor,
dev, validate) and only then tells the owner what remains, with the exact
command, for anything that needs a human (secrets, logins, app installs).

## Starting a new product from this boilerplate

1. Run the `new-product` skill with your product idea. It fills
   [project-intent.md](./project-intent.md), reshapes
   [primitives.yaml](./architecture/primitives.yaml), records the first
   decisions, and proposes the first vertical slices.
2. Pick the real stack. Replace `src/` and update the checks in `package.json`
   that are specific to the placeholder app (`features:check`, the app CLI's
   `dev` command, the ratchet globs). Keep `validate` as the one gate.
3. Delete placeholder feature docs and add real ones as routes land.
