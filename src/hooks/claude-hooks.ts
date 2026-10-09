import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { readConfig } from '../lib/config.ts'

/** Runs an npm script with the Node from .nvmrc when nvm is installed: hooks
 *  inherit the shell's default Node, which may not be the one the project's
 *  native bindings were built for. Returns { status, output }. */
export function runNpmScript(root: string, script: string) {
	const nvm = path.join(
		process.env.NVM_DIR ?? path.join(homedir(), '.nvm'),
		'nvm.sh',
	)
	const result = existsSync(nvm)
		? spawnSync(
				'bash',
				[
					'-c',
					`. "${nvm}" >/dev/null 2>&1; nvm use --silent >/dev/null 2>&1; npm run -s "$0"`,
					script,
				],
				{ cwd: root, encoding: 'utf8' },
			)
		: spawnSync('npm', ['run', '-s', script], { cwd: root, encoding: 'utf8' })
	return {
		status: result.status ?? 1,
		output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
	}
}

function hasScript(root: string, script: string) {
	const file = path.join(root, 'package.json')
	if (!existsSync(file)) return false
	const pkg = JSON.parse(readFileSync(file, 'utf8')) as {
		scripts?: Record<string, string>
	}
	return Boolean(pkg.scripts?.[script])
}

const tail = (text: string, n = 40) =>
	text.trim().split('\n').slice(-n).join('\n')

/** PostToolUse on Edit|Write: typecheck after a TypeScript edit; exit 2 feeds
 *  the errors back to the agent. */
export function runTypecheckHook(
	root: string,
	input = readFileSync(0, 'utf8'),
) {
	const file =
		(JSON.parse(input) as { tool_input?: { file_path?: string } }).tool_input
			?.file_path ?? ''
	if (!/\.(ts|tsx|mts|cts)$/.test(file)) return 0
	if (!hasScript(root, 'typecheck')) return 0
	const { status, output } = runNpmScript(root, 'typecheck')
	if (status === 0) return 0
	console.error(`Typecheck failed after editing ${file}:\n${tail(output)}`)
	return 2
}

/** Stop: when the working tree has changes, the gate must pass before the
 *  agent finishes. A second refusal in a row lets it stop and report instead
 *  of looping. */
export function runGateOnStopHook(
	root: string,
	input = readFileSync(0, 'utf8'),
) {
	const parsed = JSON.parse(input) as { stop_hook_active?: boolean }
	if (parsed.stop_hook_active) return 0
	let dirty: string
	try {
		dirty = execFileSync('git', ['status', '--porcelain'], {
			cwd: root,
			encoding: 'utf8',
		})
	} catch {
		return 0
	}
	if (!dirty.trim()) return 0
	const gate = readConfig(root)?.policy?.gate ?? 'validate'
	if (!hasScript(root, gate)) return 0
	const { status, output } = runNpmScript(root, gate)
	if (status === 0) return 0
	console.error(
		`npm run ${gate} failed. Fix it before finishing, or tell the user why you cannot:\n${tail(output)}`,
	)
	return 2
}
