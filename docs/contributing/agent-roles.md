# Agent roles

Separate the agent that **thinks with you** from the agents that **build**.

## Roles

- **Product partner.** Long-lived conversation about users, intent, priorities,
  and tradeoffs. It reads issues, data, and decision records so you and it share
  the same context, then writes a self-contained brief. It does not write
  product code.
- **Implementer.** A fresh agent per brief, in its own worktree or cloud
  environment. It builds, tests, and ships through `ship-pr`.
- **Reviewers.** Independent agents or review services with **separate context**
  from the implementer. An agent reviewing its own work adds little.
- **Maintenance routines.** Scheduled agents that garden the repo (see
  [routines](../../.claude/routines/README.md)).

Any tool can fill these roles: Claude Code sessions, a persistent assistant with
a mobile app, or cloud agents. The pattern matters, not the product. A
persistent product partner that can hand a brief to a coding agent (which then
starts its own cloud or worktree session) means you only ever talk to one agent.

Separating thinking from building lets you start a piece of work, move to the
next conversation, and keep several implementers running in parallel.

## Records live in the repo

No agent is special. Any role can be replaced by a fresh agent with no history,
because intent, decisions, primitives, and friction live in this repository, not
in a chat thread. If a decision only exists in a conversation, write it down
(decision record, doc, or issue) before the conversation ends.

## Loading context

When briefing or reviewing, have the agent fetch the context itself (the issue,
the relevant docs, the data) even when you already know it. Then you and the
agent work from the same picture, and misunderstandings surface early.

## Feedback from users

Look past a user's suggested solution to the core problem. Early on, treat every
user's feedback as worth a conversation; that does not mean building what they
proposed.
