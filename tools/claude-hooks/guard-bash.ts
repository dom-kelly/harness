import { readFileSync } from 'node:fs'
import { isExecutedDirectly } from '../lib/repo.ts'

const blockedPatterns: ReadonlyArray<{ regex: RegExp; reason: string }> = [
	{
		regex: /\bgit\s+push\b[^|;&]*\s(?:--force(?:-with-lease)?|-f)\b/,
		reason:
			'Force-pushing is never allowed. Rebase onto the latest base and push normally, or stop and report.',
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
]

export function findBlockedReason(command: string) {
	return blockedPatterns.find(({ regex }) => regex.test(command))?.reason
}

if (isExecutedDirectly(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, 'utf8')) as {
		tool_input?: { command?: string }
	}
	const reason = findBlockedReason(input.tool_input?.command ?? '')
	if (reason) {
		console.error(reason)
		process.exit(2)
	}
}
