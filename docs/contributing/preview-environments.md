# Preview environments

Every pull request gets a deployed preview so agents (and humans) can verify a
change against the real system, not only tests.

## What a preview needs

- **The whole system**, not only the web app: every service/worker the change
  could touch, deployed from the PR head.
- **Isolated storage** created per PR (database, KV, buckets) and torn down when
  the PR closes.
- **Mocks for third-party services** (payments, email, OAuth providers) so the
  preview never touches real accounts.
- **Seeded users and data**: at least one regular user and one opted into
  experiments, with realistic records for the main features. Seed credentials
  are documented here, never secrets.
- **The deployed git sha** at `/health`, so
  `npm run app -- health --origin <preview> --sha <head>` proves the preview is
  current.

## How agents use it

`ship-pr` runs `verify-app` against the preview for medium and high risk:

```bash
npm run app -- health --origin <preview-url> --sha <pr-head-sha>
npm run app -- request GET /some/route --origin <preview-url> --contains 'expected'
```

Extend the app CLI with `login` and `seed` commands as soon as the product has
auth, so agents never hand-roll cookies or curl scripts.

## Stack notes

Fill in once the stack is chosen: which platform creates previews (Vercel,
Cloudflare, Fly, Render), where the preview URL is published (PR comment,
deployment status), and how teardown happens.
