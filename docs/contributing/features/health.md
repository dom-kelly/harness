# health — `/health`

Returns `{ ok: true, sha }`. The sha comes from `GIT_SHA` or `git rev-parse`.
Deploy verification compares it to the merge commit.

Verify: `npm run app -- health --sha $(git rev-parse HEAD)`
