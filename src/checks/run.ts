import { readConfig } from '../lib/config.ts'
import { formatResult, type CheckResult } from '../lib/repo.ts'
import { checkDecisions } from './decisions.ts'
import { checkDocLinks } from './doc-links.ts'
import { checkPrimitives } from './primitives.ts'
import { checkRepoRules } from './repo-rules.ts'
import { checkSkills } from './skills.ts'

export const docChecks = [
	checkDecisions,
	(root: string) =>
		checkDocLinks(root, readConfig(root)?.checks?.ignoreLinksIn),
	checkSkills,
]

export async function runChecks(
	root: string,
	{ docsOnly = false }: { docsOnly?: boolean } = {},
) {
	const results: Array<CheckResult> = []
	for (const check of docChecks) results.push(await check(root))
	if (!docsOnly) {
		results.push(await checkPrimitives(root))
		results.push(checkRepoRules(root, readConfig(root)))
	}
	return results
}

/** Prints every result and returns the exit code. */
export function reportChecks(results: ReadonlyArray<CheckResult>) {
	let failed = 0
	for (const result of results) {
		const line = formatResult(result)
		if (result.issues.length) {
			failed++
			console.error(line)
		} else {
			console.log(line)
		}
	}
	return failed ? 1 : 0
}
