# Growth path

Pieces of a full kody-style harness that this template leaves out on purpose
([decision 0003](./decisions/0003-slim-template-grow-when-earned.md)). Each has
a trigger. When the trigger fires, add the piece in a PR that names it; until
then, do not add it because it looks useful.

Implementations exist in the template's history on GitHub
([harness-boilerplate at `b313ef2`](https://github.com/dom-kelly/harness-boilerplate/tree/b313ef2);
a product repo loses that history at `git init`) and in
[kentcdodds/kody](https://github.com/kentcdodds/kody), which is licensed
FSL-1.1-ALv2: free to use and adapt for anything that does not compete with
Kody, Apache 2.0 two years after each release.

| Piece                                                                 | Add when                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Feature flags (`off` / `experiments` / `everyone`, `removeWhen`)      | There are real users you cannot break, and a medium-risk change has no cheap rollback                        |
| Friction log, `friction` issue template, friction-sweep routine       | `gotchas.md` passes ~15 lines, or the same papercut costs time in three sessions                             |
| Routines (test/docs gardeners, legacy reaper, perf sweep, skill-trim) | You notice rot you would otherwise fix by hand twice in a month, or a skill hits the 250-line cap twice      |
| New-model audit routine                                               | A new model generation ships and the codebase is big enough to need a full pass                              |
| Visual recap (mermaid in PR body) and the mermaid checker             | A reviewer asks "what does this touch?" twice, or a diagram in docs breaks GitHub rendering                  |
| Docs temporal-language checker                                        | Changelog wording ("we now…") shows up in a doc review twice                                                 |
| Decorative-banner checker and file-size ratchet                       | An oversized file or banner comments slip through review twice                                               |
| `knip` (dead files, exports, dependencies)                            | Dead code is found by hand twice, or the dependency list stops fitting in your head                          |
| Lines-of-code report                                                  | A reaper routine exists and needs a number to show it worked                                                 |
| Feature Map and app CLI (`doctor`, `dev`, `request`, `map`)           | The app has more surfaces than a tester can hold in their head, or the same driver script gets written twice |
| `orchestrate` skill (sub-agent fan-out)                               | A task is clearly parallel by file ownership and one implementer is the bottleneck                           |
| `cleanup` skill and migration-leftover tracking                       | A migration leaves transitional code behind for a second time                                                |
| Agent-roles doc                                                       | A second person or a second agent type works in the repo                                                     |
| Preview environments                                                  | A second environment exists and a change needs eyes on it before production                                  |
| Instrumentation doc                                                   | Decisions start needing usage data, or errors should open fix tasks automatically                            |
| Disaster recovery doc and drills                                      | The product holds data someone would miss                                                                    |
| `docs/audits/`                                                        | The first dated audit is written                                                                             |

When a piece is added, move its row out of this table and into the docs that
describe it.
