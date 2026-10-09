#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
import { readFileSync } from 'node:fs'
import {
	changedFiles,
	formatChangeSummary,
	loadMap,
	summarizeChanges,
} from '../src/checks/primitives.ts'
import { reportChecks, runChecks } from '../src/checks/run.ts'
import { adoptRepo, formatAdoptReport } from '../src/cli/adopt.ts'
import { doctor, formatDoctor } from '../src/cli/doctor.ts'
import { createProduct } from '../src/cli/new.ts'
import { runGitHook } from '../src/hooks/git-hooks.ts'
import { runGuardBash } from '../src/hooks/guard-bash.ts'
import { packageVersion, readConfig } from '../src/lib/config.ts'
import { findRepoRoot } from '../src/lib/repo.ts'
import {
	formatSyncReport,
	hasChanges,
	syncTemplates,
} from '../src/lib/templates.ts'

const help = `harness ${packageVersion} — the agent harness, as a CLI

  harness new <dir> [--name x] [--no-install] [--no-git]   start a product
  harness adopt [--name x]        apply the harness to this repo, keeping your files
  harness sync [--check]          bring managed files up to date (three-way merge)
  harness check [--docs]          decisions, links, skills, primitives map, repo rules
  harness classify [--base ref | --stdin | --json]   primitives a change touches
  harness doctor                  what a fresh session needs to know
  harness hook <guard-bash | pre-commit | pre-push | node-version>
`

function flag(args: Array<string>, name: string) {
	return args.includes(name)
}

function option(args: Array<string>, name: string) {
	const index = args.indexOf(name)
	return index >= 0 ? args[index + 1] : undefined
}

async function main() {
	const [command, ...args] = process.argv.slice(2)
	const root = findRepoRoot()
	switch (command) {
		case 'new': {
			const dir = args.find((a) => !a.startsWith('--'))
			if (!dir) throw new Error('harness new <dir>')
			const { root: created, report } = createProduct(dir, {
				name: option(args, '--name'),
				install: !flag(args, '--no-install'),
				git: !flag(args, '--no-git'),
			})
			console.log(
				`created ${created} (${report.written.length} files). Next: cd ${dir} && npm run validate`,
			)
			return
		}
		case 'adopt': {
			console.log(
				formatAdoptReport(adoptRepo(root, { name: option(args, '--name') })),
			)
			return
		}
		case 'sync': {
			const config = readConfig(root)
			if (!config)
				throw new Error('no harness.json here; run `harness adopt` first')
			const check = flag(args, '--check')
			const report = await syncTemplates(root, config.product, { check })
			console.log(formatSyncReport(report, check))
			if (check && hasChanges(report)) process.exit(1)
			if (report.conflicts.length) process.exit(1)
			return
		}
		case 'check': {
			process.exit(
				reportChecks(await runChecks(root, { docsOnly: flag(args, '--docs') })),
			)
		}
		case 'classify': {
			const map = loadMap(root)
			const files = flag(args, '--stdin')
				? readFileSync(0, 'utf8')
						.split('\n')
						.map((l) => l.trim())
						.filter(Boolean)
				: changedFiles(root, option(args, '--base') ?? 'origin/main')
			const summary = summarizeChanges(map, files)
			console.log(
				flag(args, '--json')
					? JSON.stringify(summary)
					: formatChangeSummary(map, summary),
			)
			return
		}
		case 'doctor': {
			const items = doctor(root)
			console.log(formatDoctor(items))
			process.exit(items.every((i) => i.ok) ? 0 : 1)
		}
		case 'hook': {
			const hook = args[0]
			if (hook === 'guard-bash') return runGuardBash()
			if (
				hook === 'pre-commit' ||
				hook === 'pre-push' ||
				hook === 'node-version'
			) {
				return runGitHook(root, hook)
			}
			throw new Error(`unknown hook ${hook}`)
		}
		case undefined:
		case '--help':
		case '-h':
			console.log(help)
			return
		default:
			throw new Error(`unknown command ${command}\n${help}`)
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
