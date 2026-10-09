import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { packageRoot } from './repo.ts'

/** templates/manifest.json: which files the harness writes into a product. */
export type TemplateManifest = {
	/** Written by new/adopt and kept in step by sync (three-way merge). */
	managed: Array<string>
	/** Written once if absent; the product owns them afterwards. */
	owned: Array<string>
}

export type TemplateVars = { name: string }

export const defaultTemplatesDir = path.join(packageRoot, 'templates')

/** Pristine copies of managed files as last applied, so sync can merge. */
export const baseDir = '.harness/base'

export function loadManifest(templatesDir = defaultTemplatesDir) {
	return JSON.parse(
		readFileSync(path.join(templatesDir, 'manifest.json'), 'utf8'),
	) as TemplateManifest
}

export function render(content: string, vars: TemplateVars) {
	return content.replaceAll('{{name}}', vars.name)
}

function readIfExists(file: string) {
	return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

function writeFile(file: string, content: string) {
	mkdirSync(path.dirname(file), { recursive: true })
	writeFileSync(file, content)
}

export type ApplyReport = { written: Array<string>; kept: Array<string> }

/** new: overwrite everything. adopt: keep what exists, record it as managed. */
export function applyTemplates(
	root: string,
	vars: TemplateVars,
	{
		overwrite,
		templatesDir = defaultTemplatesDir,
	}: {
		overwrite: boolean
		templatesDir?: string
	},
): ApplyReport {
	const manifest = loadManifest(templatesDir)
	const report: ApplyReport = { written: [], kept: [] }
	for (const rel of manifest.managed) {
		const rendered = render(
			readFileSync(path.join(templatesDir, rel), 'utf8'),
			vars,
		)
		const target = path.join(root, rel)
		if (overwrite || !existsSync(target)) {
			writeFile(target, rendered)
			report.written.push(rel)
		} else {
			report.kept.push(rel)
		}
		writeFile(path.join(root, baseDir, rel), rendered)
	}
	for (const rel of manifest.owned) {
		const target = path.join(root, rel)
		if (existsSync(target)) {
			report.kept.push(rel)
			continue
		}
		writeFile(
			target,
			render(readFileSync(path.join(templatesDir, rel), 'utf8'), vars),
		)
		report.written.push(rel)
	}
	return report
}

export type SyncReport = {
	/** Managed files with no .harness/base copy: run `harness adopt` to record one. */
	missingBase: Array<string>
	created: Array<string>
	updated: Array<string>
	merged: Array<string>
	conflicts: Array<string>
	unchanged: Array<string>
}

export function hasChanges(report: SyncReport) {
	return (
		report.created.length +
			report.updated.length +
			report.merged.length +
			report.conflicts.length >
		0
	)
}

/** Three-way merge via git: ours = the product's copy, base = the template as
 *  last applied, theirs = the current template. Returns the merged text and
 *  whether conflict markers were left in it. */
export async function mergeThreeWay(
	ours: string,
	base: string,
	theirs: string,
) {
	const dir = await mkdtemp(path.join(tmpdir(), 'harness-merge-'))
	try {
		const files = { ours, base, theirs }
		for (const [name, content] of Object.entries(files)) {
			writeFileSync(path.join(dir, name), content)
		}
		const result = spawnSync(
			'git',
			[
				'merge-file',
				'-p',
				'-L',
				'yours',
				'-L',
				'previous template',
				'-L',
				'new template',
				path.join(dir, 'ours'),
				path.join(dir, 'base'),
				path.join(dir, 'theirs'),
			],
			{ encoding: 'utf8' },
		)
		if (result.status === null || result.status < 0) {
			throw new Error(`git merge-file failed: ${result.stderr}`)
		}
		return { content: result.stdout, conflicts: result.status > 0 }
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
}

/** Brings managed files up to the current templates, keeping local edits.
 *  With `check`, reports what would change and writes nothing. */
export async function syncTemplates(
	root: string,
	vars: TemplateVars,
	{
		check = false,
		templatesDir = defaultTemplatesDir,
	}: {
		check?: boolean
		templatesDir?: string
	} = {},
): Promise<SyncReport> {
	const manifest = loadManifest(templatesDir)
	const report: SyncReport = {
		missingBase: [],
		created: [],
		updated: [],
		merged: [],
		conflicts: [],
		unchanged: [],
	}
	const write = (rel: string, content: string) => {
		if (!check) writeFile(path.join(root, rel), content)
	}
	const writeBase = (rel: string, content: string) => {
		if (!check) writeFile(path.join(root, baseDir, rel), content)
	}
	for (const rel of manifest.managed) {
		const theirs = render(
			readFileSync(path.join(templatesDir, rel), 'utf8'),
			vars,
		)
		const ours = readIfExists(path.join(root, rel))
		const base = readIfExists(path.join(root, baseDir, rel))
		if (ours !== undefined && base === undefined && ours !== theirs) {
			report.missingBase.push(rel)
			continue
		}
		if (ours === undefined) {
			write(rel, theirs)
			writeBase(rel, theirs)
			report.created.push(rel)
		} else if (theirs === base || ours === theirs || base === undefined) {
			writeBase(rel, theirs)
			report.unchanged.push(rel)
		} else if (ours === base) {
			write(rel, theirs)
			writeBase(rel, theirs)
			report.updated.push(rel)
		} else {
			const merged = await mergeThreeWay(ours, base!, theirs)
			write(rel, merged.content)
			writeBase(rel, theirs)
			;(merged.conflicts ? report.conflicts : report.merged).push(rel)
		}
	}
	for (const rel of manifest.owned) {
		if (!existsSync(path.join(root, rel))) {
			write(
				rel,
				render(readFileSync(path.join(templatesDir, rel), 'utf8'), vars),
			)
			report.created.push(rel)
		}
	}
	return report
}

export function formatSyncReport(report: SyncReport, check: boolean) {
	const verb = check ? 'would be' : 'were'
	const lines: Array<string> = []
	const section = (label: string, items: Array<string>) => {
		if (items.length) lines.push(`${label}: ${items.join(', ')}`)
	}
	section(`created`, report.created)
	section(`updated (no local edits)`, report.updated)
	section(`merged (local edits kept)`, report.merged)
	section(`CONFLICTS (resolve the markers)`, report.conflicts)
	section(
		`NO BASE RECORDED (run \`harness adopt\` to record one, then sync again)`,
		report.missingBase,
	)
	if (lines.length === 0) return 'sync: everything is up to date'
	return `sync: ${lines.length} group(s) of files ${verb} changed\n${lines.map((l) => `  ${l}`).join('\n')}`
}
