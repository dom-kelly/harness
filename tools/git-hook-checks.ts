import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isExecutedDirectly, repoRoot } from './lib/repo.ts'

const docsOnlyPattern = /^(docs\/.*\.md$|\.claude\/.*\.md$|[^/]+\.md$)/
const zeroSha = /^0+$/

// Git hooks run with the shell's default node, not the one `nvm use` picked, and
// native bindings (oxlint) are installed for the Node in .nvmrc. Check first, so
// the fix is the first line printed rather than a binding stack trace.
export function nodeVersionIssue(
	version: string,
	nvmrc: string,
	minimum = [22, 18],
) {
	const want = nvmrc.trim().replace(/^v/, '').split('.').map(Number)
	const have = version.split('.').map(Number)
	const [major = 0, minor = 0] = have
	const [wantMajor = minimum[0], wantMinor] = want
	const minMinor = wantMinor ?? (wantMajor === minimum[0] ? minimum[1]! : 0)
	if (major !== wantMajor || minor < minMinor) {
		return `node ${nvmrc.trim()} (>= ${wantMajor}.${minMinor}) required, have ${version}. Run \`nvm use\` (reads .nvmrc) and retry.`
	}
	return undefined
}

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

function git(args: Array<string>) {
	try {
		return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
			.split('\n')
			.filter(Boolean)
	} catch {
		return undefined
	}
}

function pushedFiles() {
	const refs = parsePrePushInput(readFileSync(0, 'utf8'))
	const files = new Set<string>()
	for (const { localSha, remoteSha } of refs) {
		const range = zeroSha.test(remoteSha)
			? ['origin/main...' + localSha]
			: [`${remoteSha}..${localSha}`]
		const changed = git(['diff', '--name-only', '--no-renames', ...range])
		if (!changed) return undefined
		for (const file of changed) files.add(file)
	}
	return [...files]
}

function run(script: string) {
	const result = spawnSync('npm', ['run', '--silent', script], {
		cwd: repoRoot,
		stdio: 'inherit',
	})
	if (result.status !== 0) process.exit(result.status ?? 1)
}

const docChecks = ['docs:check-links', 'docs:check-decisions', 'skills:check']

function main() {
	const hook = process.argv[2]
	const nvmrc = readFileSync(`${repoRoot}/.nvmrc`, 'utf8')
	const issue = nodeVersionIssue(process.versions.node, nvmrc)
	if (issue) {
		console.error(`${hook}: ${issue}`)
		process.exit(1)
	}
	if (hook === 'node-version') return
	const files =
		hook === 'pre-commit'
			? git(['diff', '--cached', '--name-only', '--no-renames'])
			: pushedFiles()
	if (files && files.length === 0) return
	for (const check of docChecks) run(check)
	if (files && isDocsOnly(files)) {
		console.log(`${hook}: docs-only change; skipped typecheck and tests`)
		return
	}
	run('typecheck')
	run('primitives:check')
	if (hook === 'pre-push') run('test')
}

if (isExecutedDirectly(import.meta.url)) main()
