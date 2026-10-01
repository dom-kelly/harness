import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
)

const skippedDirs = new Set(['node_modules', '.git', '.tmp', 'coverage'])

export async function listFiles(
	relativeDir: string,
	include: (relativePath: string) => boolean,
): Promise<Array<string>> {
	const results: Array<string> = []
	async function walk(dir: string) {
		let entries
		try {
			entries = await readdir(path.join(repoRoot, dir), { withFileTypes: true })
		} catch {
			return
		}
		for (const entry of entries) {
			const rel = path.posix.join(dir, entry.name)
			if (entry.isDirectory()) {
				if (!skippedDirs.has(entry.name)) await walk(rel)
			} else if (include(rel)) {
				results.push(rel)
			}
		}
	}
	await walk(relativeDir)
	return results.toSorted()
}

export function readRepoFile(relativePath: string) {
	return readFile(path.join(repoRoot, relativePath), 'utf8')
}

export function isExecutedDirectly(importMetaUrl: string) {
	return process.argv[1] === fileURLToPath(importMetaUrl)
}

export type CheckIssue = { file: string; line?: number; message: string }

export function reportAndExit(
	checkName: string,
	issues: ReadonlyArray<CheckIssue>,
	remediation: string,
) {
	if (issues.length === 0) {
		console.log(`✅ ${checkName}: ok`)
		return
	}
	console.error(`❌ ${checkName}: ${issues.length} issue(s)`)
	for (const issue of issues) {
		const location = issue.line ? `${issue.file}:${issue.line}` : issue.file
		console.error(`  ${location} — ${issue.message}`)
	}
	console.error(`\nHow to fix: ${remediation}`)
	process.exitCode = 1
}
