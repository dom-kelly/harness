import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	repoRoot,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

export const ratchetGroups = [
	{
		id: 'source',
		maxLines: 400,
		matches: (f: string) =>
			/^(src|tools)\/.*\.ts$/.test(f) && !f.endsWith('.test.ts'),
	},
	{
		id: 'tests',
		maxLines: 800,
		matches: (f: string) => f.endsWith('.test.ts'),
	},
] as const

type GroupId = (typeof ratchetGroups)[number]['id']
type Snapshot = Record<GroupId, Array<string>>

const snapshotPath = path.join(repoRoot, 'tools/file-size-ratchet.json')

export function evaluateRatchet(
	lineCounts: ReadonlyMap<string, number>,
	snapshot: Snapshot,
) {
	const issues: Array<CheckIssue> = []
	for (const group of ratchetGroups) {
		const allowed = new Set(snapshot[group.id])
		for (const [file, lines] of lineCounts) {
			if (!group.matches(file)) continue
			const over = lines > group.maxLines
			if (over && !allowed.has(file)) {
				issues.push({
					file,
					message: `${lines} lines > ${group.maxLines} (${group.id}); split it`,
				})
			}
			if (!over && allowed.has(file)) {
				issues.push({
					file,
					message: `now under budget; remove it from tools/file-size-ratchet.json`,
				})
			}
		}
		for (const file of allowed) {
			if (!lineCounts.has(file)) {
				issues.push({ file, message: 'listed in ratchet snapshot but missing' })
			}
		}
	}
	return issues
}

async function main() {
	const files = await listFiles('.', (f) =>
		ratchetGroups.some((g) => g.matches(f)),
	)
	const lineCounts = new Map<string, number>()
	for (const file of files) {
		lineCounts.set(file, (await readRepoFile(file)).split('\n').length)
	}
	const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot
	if (process.argv.includes('--write')) {
		const next = Object.fromEntries(
			ratchetGroups.map((g) => [
				g.id,
				[...lineCounts]
					.filter(([f, n]) => g.matches(f) && n > g.maxLines)
					.map(([f]) => f),
			]),
		)
		await writeFile(snapshotPath, `${JSON.stringify(next, null, '\t')}\n`)
		return
	}
	reportAndExit(
		'file-size ratchet',
		evaluateRatchet(lineCounts, snapshot),
		'Split oversized files. The snapshot only ever shrinks; never add a file to it to pass.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
