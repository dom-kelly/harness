import path from 'node:path'
import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

const decisionsDir = 'docs/contributing/decisions'
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

async function main() {
	const files = await listFiles(decisionsDir, (f) => f.endsWith('.md'))
	const names = files.map((f) => path.posix.basename(f))
	const indexSource = await readRepoFile(`${decisionsDir}/index.md`)
	const headings = new Map<string, string>()
	for (const file of files) {
		const firstHeading = (await readRepoFile(file))
			.split('\n')
			.find((line) => line.startsWith('# '))
		headings.set(path.posix.basename(file), firstHeading ?? '')
	}
	reportAndExit(
		'decision records',
		findDecisionIssues(names, indexSource, headings),
		'Renumber the later record to the next unused number and list it in decisions/index.md.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
