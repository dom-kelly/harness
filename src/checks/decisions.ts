import path from 'node:path'
import {
	listFiles,
	readRepoFile,
	type CheckIssue,
	type CheckResult,
} from '../lib/repo.ts'

export const decisionsDir = 'docs/contributing/decisions'
const recordPattern = /^(\d{4})-[a-z0-9-]+\.md$/

export function findDecisionIssues(
	fileNames: ReadonlyArray<string>,
	indexSource: string,
	headings: ReadonlyMap<string, string> = new Map(),
) {
	const issues: Array<CheckIssue> = []
	const seen = new Map<string, string>()
	for (const name of fileNames) {
		if (name === 'index.md') continue
		const file = `${decisionsDir}/${name}`
		const match = recordPattern.exec(name)
		if (!match) {
			issues.push({ file, message: 'name must be NNNN-kebab-slug.md' })
			continue
		}
		const number = match[1]!
		if (number === '0000') continue
		const lab = name.endsWith('-lab.md')
		const prior = seen.get(number)
		if (prior && !lab) {
			issues.push({
				file,
				message: `duplicate number ${number} (also ${prior})`,
			})
		}
		if (!lab) seen.set(number, name)
		const heading = headings.get(name)
		if (heading !== undefined && !heading.startsWith(`# ${number}:`)) {
			issues.push({
				file,
				message: `first heading must start with "# ${number}:"`,
			})
		}
		if (!indexSource.includes(`./${name}`)) {
			issues.push({ file, message: 'not linked from decisions/index.md' })
		}
	}
	return issues
}

export async function checkDecisions(root: string): Promise<CheckResult> {
	const files = await listFiles(root, decisionsDir, (f) => f.endsWith('.md'))
	const names = files.map((f) => path.posix.basename(f))
	const indexSource = names.includes('index.md')
		? await readRepoFile(root, `${decisionsDir}/index.md`)
		: ''
	const headings = new Map<string, string>()
	for (const file of files) {
		const firstHeading = (await readRepoFile(root, file))
			.split('\n')
			.find((line) => line.startsWith('# '))
		headings.set(path.posix.basename(file), firstHeading ?? '')
	}
	return {
		name: 'decision records',
		issues: findDecisionIssues(names, indexSource, headings),
		remediation:
			'Renumber the later record to the next unused number and list it in decisions/index.md.',
	}
}
