# Developing the harness

Requires Node 22.18 or later (`nvm use` reads `.nvmrc`).

```bash
npm install
npm run validate          # the one gate: format, lint, types, tests, the CLI's own checks
node bin/harness.ts --help
```

## Layout

| Path                 | What                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `bin/harness.ts`     | CLI entry: new, adopt, sync, check, classify, doctor, hook                   |
| `src/checks/`        | Checkers behind `harness check` and the git hooks                            |
| `src/hooks/`         | The Bash guard (Claude Code PreToolUse) and the git hook runner              |
| `src/lib/`           | Repo discovery, `harness.json`, template apply and three-way sync            |
| `src/cli/`           | new, adopt, doctor                                                           |
| `templates/`         | Files written into products; `manifest.json` says which are managed vs owned |
| `scaffold/app-node/` | The placeholder app `harness new` starts from                                |
| `docs/contributing/` | These docs, about the harness itself                                         |

The root `.claude/skills` holds copies of `templates/.claude/skills`: the
harness uses the same skills it ships. A test fails if the copies drift, so edit
the template and copy it over (a symlink breaks git stash and npm pack). Their
links point at product docs, so `harness.json` lists them under
`checks.ignoreLinksIn`.

## Changing a template

1. Edit the file under `templates/`. Product-facing docs describe a product, not
   this repo; keep them stack-agnostic.
2. If you add or remove a file, update `templates/manifest.json`. Managed files
   are synced into products (three-way merge); owned files are written once and
   never touched again.
3. `npm run validate`. The CLI tests (`src/cli/cli.test.ts`) create a product in
   a temp dir and run every check against it, so a template that breaks a
   product fails here.
4. In a product, `npx harness sync` (or `--check` in CI to see what is behind).

## Trying it against a real product

```bash
npm link                      # once, here
cd ../some-product && npm link @dom-kelly/harness
npx harness doctor
```

Unlink with `npm unlink @dom-kelly/harness && npm install` when done.
