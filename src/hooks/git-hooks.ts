import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { checkNodeVersion } from '../checks/node-version.ts'
import { reportChecks, runChecks } from '../checks/run.ts'
import { runNpmScript } from './claude-hooks.ts'

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

function packageJson(root: string) {
	const file = path.join(root, 'package.json')
	if (!existsSync(file)) return {}
	return JSON.parse(readFileSync(file, 'utf8')) as {
		scripts?: Record<string, string>
		'lint-staged'?: unknown
	}
}

export function hasLintStaged(root: string) {
	if (packageJson(root)['lint-staged']) return true
	return [
		'.lintstagedrc',
		'.lintstagedrc.json',
		'.lintstagedrc.yaml',
		'.lintstagedrc.yml',
		'.lintstagedrc.mjs',
		'.lintstagedrc.js',
		'lint-staged.config.js',
		'lint-staged.config.mjs',
	].some((f) => existsSync(path.join(root, f)))
}

function exec(root: string, command: string, args: Array<string>) {
	const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
	return result.status ?? 1
}

/** Runs an npm script if the product has one; an adopted repo may not. */
function runScript(root: string, hook: string, script: string) {
	if (!packageJson(root).scripts?.[script]) {
		console.log(`${hook}: no "${script}" script in package.json; skipped`)
		return 0
	}
	const { status, output } = runNpmScript(root, script)
	if (status !== 0) process.stderr.write(output)
	return status
}

/** pre-commit / pre-push: node version first (the fix should be the first line
 *  printed), lint-staged when configured, the doc checks, then typecheck and
 *  the primitives map for non-docs changes, then tests on push. */
export async function runGitHook(
	root: string,
	hook: 'pre-commit' | 'pre-push' | 'node-version',
): Promise<number> {
	const issue = checkNodeVersion(root)
	if (issue) {
		console.error(`${hook}: ${issue}`)
		return 1
	}
	if (hook === 'node-version') return 0
	if (hook === 'pre-commit' && hasLintStaged(root)) {
		const code = exec(root, 'npx', ['lint-staged'])
		if (code) return code
	}
	const files =
		hook === 'pre-commit'
			? git(root, ['diff', '--cached', '--name-only', '--no-renames'])
			: pushedFiles(root)
	if (files && files.length === 0) return 0
	const docsOnly = files !== undefined && isDocsOnly(files)
	const code = reportChecks(await runChecks(root, { docsOnly }))
	if (code) return code
	if (docsOnly) {
		console.log(`${hook}: docs-only change; skipped typecheck and tests`)
		return 0
	}
	const typecheck = runScript(root, hook, 'typecheck')
	if (typecheck) return typecheck
	return hook === 'pre-push' ? runScript(root, hook, 'test') : 0
}
