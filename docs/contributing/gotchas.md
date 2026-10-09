# Gotchas

Real mistakes and their fixes, one line each. If a gotcha can become a checker
or a test, make it one and delete the line.

- Git hooks run with the shell's default `node`, not the one your session
  selected; native bindings (oxlint) are installed for the Node in `.nvmrc`. The
  hook checks the major version first and prints the fix.
- Other agents may be working in a repo at the same time (`git worktree list`).
  Stage files by explicit path, never `git add -A`; do branch work in your own
  worktree; check for an existing PR before opening one.
- A review bot's status badge can stay "in progress" after its review is posted,
  and it pauses itself after a run of commits. Read the PR timeline for the
  review on the current head SHA, not the badge.
- `npm link` hides packaging bugs: a linked package runs from its real path, so
  `.ts` entry points work there and fail from `node_modules`
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). Trust the pack-and-install
  lane, not a linked run.
- A symlink in the repo breaks `git stash` (used by lint-staged) with "beyond a
  symbolic link"; keep copies and a test that they match.
- kody is licensed FSL-1.1-ALv2 (GitHub shows "Other"), which permits
  non-competing use. Kent's Kody-platform packages carry no licence of their
  own.
