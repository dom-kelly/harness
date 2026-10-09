import { readFileSync } from 'node:fs'
import { readConfig } from '../lib/config.ts'
import { findRepoRoot } from '../lib/repo.ts'

export type BlockedPattern = { regex: RegExp; reason: string }

/** Always refused, in any product. */
export const defaultBlocked: ReadonlyArray<BlockedPattern> = [
	{
		regex: /\bgit\s+push\b[^|;&]*\s(?:--force(?:-with-lease)?|-f)\b/,
		reason:
			'Force-pushing is never allowed. Rebase onto the latest base and push normally, or stop and report.',
	},
	{
		regex: /\bgit\s+push\b[^|;&]*[\s:](?:main|master)\b(?!\S)/,
		reason:
			'Pushing straight to main bypasses the PR, CI and the shipping policy. Push a branch and open a PR.',
	},
	{
		regex: /\bgit\s+(?:commit|push)\b[^|;&]*\s--no-verify\b/,
		reason:
			'Skipping git hooks hides failures. Fix what the hook reports; if the hook is wrong, fix the hook.',
	},
	{
		regex: /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f)/,
		reason:
			'Destructive git commands discard work. Ask the owner first, naming exactly what would be lost.',
	},
	{
		regex: /\bgh\s+pr\s+merge\b[^|;&]*\s--(?:admin|auto)\b/,
		reason:
			'Merging with --admin or --auto skips the shipping policy. Use a plain `gh pr merge` or hand it to the owner.',
	},
]

export function findBlockedReason(
	command: string,
	extra: ReadonlyArray<BlockedPattern> = [],
) {
	return [...defaultBlocked, ...extra].find(({ regex }) => regex.test(command))
		?.reason
}

/** Claude Code PreToolUse hook for Bash: exit 2 refuses the command and shows
 *  the reason to the agent. */
export function runGuardBash(input = readFileSync(0, 'utf8')) {
	const parsed = JSON.parse(input) as { tool_input?: { command?: string } }
	const command = parsed.tool_input?.command ?? ''
	const extra = (readConfig(findRepoRoot())?.guard?.blocked ?? []).map(
		({ pattern, reason }) => ({ regex: new RegExp(pattern), reason }),
	)
	const reason = findBlockedReason(command, extra)
	if (reason) {
		console.error(`Blocked by the harness: ${reason}`)
		process.exit(2)
	}
}
