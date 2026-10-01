import { execFileSync, spawn } from 'node:child_process'
import { existsSync, openSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { features } from '../src/features.ts'
import { flagEnvKey, flags } from '../src/flags.ts'
import { routes } from '../src/routes.ts'
import {
	isExecutedDirectly,
	repoRoot,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

const defaultOrigin = `http://localhost:${process.env.PORT ?? 3000}`
const featureDocsDir = 'docs/contributing/features'

function option(args: Array<string>, name: string) {
	const index = args.indexOf(name)
	return index >= 0 ? args[index + 1] : undefined
}

async function isHealthy(origin: string) {
	try {
		const response = await fetch(`${origin}/health`)
		return response.ok
	} catch {
		return false
	}
}

export function meetsNodeVersion(version: string, minimum = [22, 18]) {
	const [major = 0, minor = 0] = version.split('.').map(Number)
	const [minMajor = 0, minMinor = 0] = minimum
	return major > minMajor || (major === minMajor && minor >= minMinor)
}

async function doctor() {
	const checks: Array<[string, boolean, string]> = [
		[
			`node >= 22.18 (have ${process.versions.node})`,
			meetsNodeVersion(process.versions.node),
			'nvm install 22 && nvm use 22',
		],
		[
			'node_modules installed',
			existsSync(path.join(repoRoot, 'node_modules')),
			'npm install',
		],
		[
			'git hooks installed',
			existsSync(path.join(repoRoot, '.husky/_')),
			'npm run prepare',
		],
		[
			`dev server healthy at ${defaultOrigin}`,
			await isHealthy(defaultOrigin),
			'npm run app -- dev',
		],
	]
	for (const [label, ok, fix] of checks) {
		console.log(ok ? `✅ ${label}` : `⚠️  ${label} — fix: ${fix}`)
	}
}

async function dev() {
	if (await isHealthy(defaultOrigin)) {
		console.log(`App running at ${defaultOrigin} (reused)`)
		return
	}
	await mkdir(path.join(repoRoot, '.tmp'), { recursive: true })
	const logPath = path.join(repoRoot, '.tmp/dev-server.log')
	const log = openSync(logPath, 'a')
	const child = spawn('node', ['src/server.ts'], {
		cwd: repoRoot,
		detached: true,
		stdio: ['ignore', log, log],
	})
	child.unref()
	for (let attempt = 0; attempt < 50; attempt++) {
		if (await isHealthy(defaultOrigin)) {
			console.log(
				`App running at ${defaultOrigin} (pid ${child.pid}, log .tmp/dev-server.log)`,
			)
			return
		}
		await new Promise((r) => setTimeout(r, 100))
	}
	console.error(
		'Dev server did not become healthy. Read .tmp/dev-server.log for the cause.',
	)
	process.exitCode = 1
}

async function request(args: Array<string>) {
	const [method = 'GET', pathname = '/'] = args
	const origin = option(args, '--origin') ?? defaultOrigin
	const contains = option(args, '--contains')
	const response = await fetch(`${origin}${pathname}`, { method })
	const body = await response.text()
	if (args.includes('--dump')) {
		await mkdir(path.join(repoRoot, '.tmp'), { recursive: true })
		await writeFile(path.join(repoRoot, '.tmp/app-cli-body'), body)
	}
	console.log(`${response.status} ${method} ${pathname}`)
	console.log(body.length > 2000 ? `${body.slice(0, 2000)}…` : body)
	if (!response.ok || (contains && !body.includes(contains)))
		process.exitCode = 1
}

export function isShaDeployed(
	expected: string,
	deployed: string,
	isAncestor: (ancestor: string, descendant: string) => boolean,
) {
	if (deployed.startsWith(expected) || expected.startsWith(deployed))
		return true
	return isAncestor(expected, deployed)
}

function gitIsAncestor(ancestor: string, descendant: string) {
	try {
		execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
			cwd: repoRoot,
			stdio: 'ignore',
		})
		return true
	} catch {
		return false
	}
}

async function health(args: Array<string>) {
	const origin = option(args, '--origin') ?? defaultOrigin
	const expectedSha = option(args, '--sha')
	const response = await fetch(`${origin}/health`)
	const body = (await response.json()) as { ok: boolean; sha: string }
	console.log(JSON.stringify(body))
	if (!body.ok) {
		process.exitCode = 1
		return
	}
	if (expectedSha && !isShaDeployed(expectedSha, body.sha, gitIsAncestor)) {
		console.error(
			`Deployed ${body.sha} is neither ${expectedSha} nor a descendant of it.`,
		)
		process.exitCode = 1
	}
}

export function findFeatureMapIssues(
	routeKeys: ReadonlyArray<string>,
	hasDoc: (id: string) => boolean,
) {
	const issues: Array<CheckIssue> = []
	const routePaths = new Set(routeKeys.map((key) => key.split(' ')[1]))
	for (const feature of features) {
		if (!routePaths.has(feature.path)) {
			issues.push({
				file: 'src/features.ts',
				message: `${feature.id}: ${feature.path} has no route`,
			})
		}
		if (!hasDoc(feature.id)) {
			issues.push({
				file: `${featureDocsDir}/${feature.id}.md`,
				message: 'feature doc missing',
			})
		}
	}
	const featurePaths = new Set(features.map((f) => f.path))
	for (const routePath of routePaths) {
		if (routePath && !featurePaths.has(routePath)) {
			issues.push({
				file: 'src/routes.ts',
				message: `${routePath} is not in the feature map`,
			})
		}
	}
	return issues
}

function map(args: Array<string>) {
	if (args.includes('--check')) {
		reportAndExit(
			'feature map',
			findFeatureMapIssues(Object.keys(routes), (id) =>
				existsSync(path.join(repoRoot, featureDocsDir, `${id}.md`)),
			),
			'Every route has a feature entry in src/features.ts and a doc in docs/contributing/features/.',
		)
		return
	}
	const query = args[0]?.toLowerCase()
	for (const f of features) {
		if (
			!query ||
			f.id.includes(query) ||
			f.summary.toLowerCase().includes(query)
		) {
			console.log(`${f.id.padEnd(16)} ${f.path.padEnd(24)} ${f.summary}`)
		}
	}
}

function listFlags() {
	for (const [name, definition] of Object.entries(flags)) {
		const audience = process.env[flagEnvKey(name)] ?? definition.audience
		console.log(
			`${name.padEnd(24)} ${audience.padEnd(12)} remove when: ${definition.removeWhen}`,
		)
	}
}

const commands: Record<string, (args: Array<string>) => unknown> = {
	doctor,
	dev,
	request,
	health,
	map,
	flags: listFlags,
}

if (isExecutedDirectly(import.meta.url)) {
	const [command = 'help', ...rest] = process.argv.slice(2)
	const run = commands[command]
	if (!run) {
		console.log(
			`Usage: npm run app -- <${Object.keys(commands).join('|')}> [args]`,
		)
	} else {
		await run(rest)
	}
}
