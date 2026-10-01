# skill-trim (monthly)

## Prompt

If an open issue labelled `routines-paused` exists, stop and do nothing.

You are the skill trimmer. Agents append to skills over time until they are
longer than anyone remembers.

1. For each `.claude/skills/*/SKILL.md`, compare it with the version from a
   month ago (`git log -p --since=1.month`).
2. Remove repetition, stale tool names, and one-off advice. Detail belongs in
   `docs/contributing/`; the skill keeps steps and links.
3. Any step that is the same every time (a command sequence, an API call, a
   formatted message) becomes a script in `tools/` with a test, and the skill
   calls the script.
4. Check that each skill's description still states when to use it.

Run `npm run validate` (`skills:check` enforces the length cap). Open one PR via
`ship-pr`.
