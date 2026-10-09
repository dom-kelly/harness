import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkNodeVersion } from '../checks/node-version.ts'
import { reportChecks, runChecks } from '../checks/run.ts'

const docsOnlyPattern =
	/^(docs\/.*\.md$|\.claude\/.*\.md$|\.agents\/.*\.md$|[^/]+\.md$)/
const zeroSha = /^0+$/

export function isDocsOnly(files: ReadonlyArray<string>) {
	return files.length > 0 && files.every((f) => docsOnlyPattern.test(f))
}

export type PushedRef = { localSha: string; remoteSha: string }

export function parsePrePushInput(input: string): Array<PushedRef> {
	return input
		.split('\n')
		.map((line) => line.trim().split(/\s+/))
		.filter((parts) => parts.length === 4)
		.map(([, localSha, , remoteSha]) => ({
			localSha: localSha!,
			remoteSha: remoteSha!,
		}))
		.filter(({ localSha }) => !zeroSha.test(localSha))
}

function git(root: string, args: Array<string>) {
	try {
		return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
			.split('\n')
			.filter(Boolean)
	} catch {
		return undefined
	}
}

function pushedFiles(root: string) {
	const refs = parsePrePushInput(readFileSync(0, 'utf8'))
	const files = new Set<string>()
	for (const { localSha, remoteSha } of refs) {
		const range = zeroSha.test(remoteSha)
			? `origin/main...${localSha}`
			: `${remoteSha}..${localSha}`
		const changed = git(root, ['diff', '--name-only', '--no-renames', range])
		if (!changed) return undefined
		for (const file of changed) files.add(file)
	}
	return [...files]
}

function run(root: string, script: string) {
	const result = spawnSync('npm', ['run', '--silent', script], {
		cwd: root,
		stdio: 'inherit',
	})
	if (result.status !== 0) process.exit(result.status ?? 1)
}

/** pre-commit / pre-push: node version first (the fix should be the first line
 *  printed), then the doc checks, then typecheck and the primitives map for
 *  non-docs changes, then tests on push. */
export async function runGitHook(
	root: string,
	hook: 'pre-commit' | 'pre-push' | 'node-version',
) {
	const issue = checkNodeVersion(root)
	if (issue) {
		console.error(`${hook}: ${issue}`)
		process.exit(1)
	}
	if (hook === 'node-version') return
	const files =
		hook === 'pre-commit'
			? git(root, ['diff', '--cached', '--name-only', '--no-renames'])
			: pushedFiles(root)
	if (files && files.length === 0) return
	const docsOnly = files !== undefined && isDocsOnly(files)
	const code = reportChecks(await runChecks(root, { docsOnly }))
	if (code) process.exit(code)
	if (docsOnly) {
		console.log(`${hook}: docs-only change; skipped typecheck and tests`)
		return
	}
	run(root, 'typecheck')
	if (hook === 'pre-push') run(root, 'test')
}
