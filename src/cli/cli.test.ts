import { existsSync } from 'node:fs'
import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { checkDocLinks } from '../checks/doc-links.ts'
import { runChecks } from '../checks/run.ts'
import { readConfig } from '../lib/config.ts'
import { packageRoot } from '../lib/repo.ts'
import {
	applyTemplates,
	baseDir,
	mergeThreeWay,
	syncTemplates,
} from '../lib/templates.ts'
import { adoptRepo, patchPackageJson } from './adopt.ts'
import { parseArgs } from './args.ts'
import { createProduct } from './new.ts'

async function tmp(prefix: string) {
	return mkdtemp(path.join(tmpdir(), `harness-${prefix}-`))
}

test('new: a product has every template, harness.json, and passes the checks', async () => {
	const dir = await tmp('new')
	try {
		const { root, report } = createProduct(path.join(dir, 'my-product'), {
			install: false,
			git: false,
		})
		expect(report.written).toContain('CLAUDE.md')
		expect(existsSync(path.join(root, 'src/server.ts'))).toBe(true)
		expect(existsSync(path.join(root, '.gitignore'))).toBe(true)
		expect(existsSync(path.join(root, 'gitignore'))).toBe(false)
		expect(existsSync(path.join(root, baseDir, 'CLAUDE.md'))).toBe(true)
		expect(readConfig(root)?.product.name).toBe('my-product')
		expect(await readFile(path.join(root, 'package.json'), 'utf8')).toContain(
			'"name": "my-product"',
		)
		const results = await runChecks(root)
		expect(results.flatMap((r) => r.issues)).toEqual([])
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test('adopt keeps existing files and only adds to package.json', async () => {
	const root = await tmp('adopt')
	try {
		await writeFile(
			path.join(root, 'package.json'),
			JSON.stringify({ name: 'meals', scripts: { test: 'vitest run' } }),
		)
		await writeFile(path.join(root, 'CLAUDE.md'), '# mine\n')
		const result = adoptRepo(root)
		expect(result.name).toBe('meals')
		expect(result.report.kept).toContain('CLAUDE.md')
		expect(await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).toBe(
			'# mine\n',
		)
		expect(result.report.written).toContain('.claude/skills/ship-pr/SKILL.md')
		const pkg = JSON.parse(
			await readFile(path.join(root, 'package.json'), 'utf8'),
		)
		expect(pkg.scripts.test).toBe('vitest run')
		expect(pkg.scripts.harness).toBe('harness')
		expect(pkg.devDependencies['@dom-kelly/harness']).toBe(
			'git+https://github.com/dom-kelly/harness.git',
		)
		expect(patchPackageJson(JSON.stringify(pkg)).added).toEqual([])
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})

async function fakeTemplates(dir: string, files: Record<string, string>) {
	for (const [rel, content] of Object.entries(files)) {
		await mkdir(path.dirname(path.join(dir, rel)), { recursive: true })
		await writeFile(path.join(dir, rel), content)
	}
	await writeFile(
		path.join(dir, 'manifest.json'),
		JSON.stringify({
			managed: Object.keys(files).filter((f) => f.startsWith('managed')),
			owned: Object.keys(files).filter((f) => f.startsWith('owned')),
		}),
	)
}

test('sync: updates untouched files, merges edited ones, flags conflicts, never touches owned', async () => {
	const dir = await tmp('sync')
	const root = path.join(dir, 'repo')
	const templates = path.join(dir, 'templates')
	try {
		await mkdir(root)
		await fakeTemplates(templates, {
			'managed/plain.md': 'a\nb\nc\n',
			'managed/edited.md': 'one\ntwo\nthree\n',
			'managed/clash.md': 'left\n',
			'managed/named.md': 'Product: {{name}}\n',
			'owned/mine.md': 'template\n',
		})
		const vars = { name: 'meals' }
		applyTemplates(root, vars, { overwrite: true, templatesDir: templates })
		expect(await readFile(path.join(root, 'managed/named.md'), 'utf8')).toBe(
			'Product: meals\n',
		)
		// local edits
		await writeFile(
			path.join(root, 'managed/edited.md'),
			'one\ntwo\nthree\nfour\n',
		)
		await writeFile(path.join(root, 'managed/clash.md'), 'mine\n')
		await writeFile(path.join(root, 'owned/mine.md'), 'changed by product\n')
		// template changes
		await fakeTemplates(templates, {
			'managed/plain.md': 'a\nb\nc\nd\n',
			'managed/edited.md': 'zero\none\ntwo\nthree\n',
			'managed/clash.md': 'theirs\n',
			'managed/named.md': 'Product: {{name}}\n',
			'managed/added.md': 'new\n',
			'owned/mine.md': 'template v2\n',
		})

		const dry = await syncTemplates(root, vars, {
			check: true,
			templatesDir: templates,
		})
		expect(dry).toMatchObject({
			created: ['managed/added.md'],
			updated: ['managed/plain.md'],
			merged: ['managed/edited.md'],
			conflicts: ['managed/clash.md'],
			unchanged: ['managed/named.md'],
		})
		expect(await readFile(path.join(root, 'managed/plain.md'), 'utf8')).toBe(
			'a\nb\nc\n',
		)

		const report = await syncTemplates(root, vars, { templatesDir: templates })
		expect(report).toEqual(dry)
		expect(await readFile(path.join(root, 'managed/plain.md'), 'utf8')).toBe(
			'a\nb\nc\nd\n',
		)
		expect(await readFile(path.join(root, 'managed/edited.md'), 'utf8')).toBe(
			'zero\none\ntwo\nthree\nfour\n',
		)
		expect(
			await readFile(path.join(root, 'managed/clash.md'), 'utf8'),
		).toContain('<<<<<<<')
		expect(await readFile(path.join(root, 'managed/added.md'), 'utf8')).toBe(
			'new\n',
		)
		expect(await readFile(path.join(root, 'owned/mine.md'), 'utf8')).toBe(
			'changed by product\n',
		)
		expect(
			await readFile(path.join(root, baseDir, 'managed/edited.md'), 'utf8'),
		).toBe('zero\none\ntwo\nthree\n')

		const again = await syncTemplates(root, vars, {
			check: true,
			templatesDir: templates,
		})
		expect(again.created.concat(again.updated, again.merged)).toEqual([])
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test('the harness uses the same skills it ships (copies, not a symlink)', async () => {
	const templateSkills = path.join(packageRoot, 'templates/.claude/skills')
	const names = await readdir(templateSkills)
	expect(names.length).toBeGreaterThan(0)
	for (const name of names) {
		const rel = path.join(name, 'SKILL.md')
		expect(
			await readFile(path.join(packageRoot, '.claude/skills', rel), 'utf8'),
			`${rel} differs: cp -R templates/.claude/skills .claude/`,
		).toBe(await readFile(path.join(templateSkills, rel), 'utf8'))
	}
})

test('three-way merge keeps both sides when they touch different lines', async () => {
	const merged = await mergeThreeWay(
		'1\n2\n3\nmine\n',
		'1\n2\n3\n',
		'0\n1\n2\n3\n',
	)
	expect(merged).toEqual({ content: '0\n1\n2\n3\nmine\n', conflicts: false })
})

test('arguments: options take the next token, flags do not, the rest are positionals', () => {
	expect(parseArgs(['new', '--name', 'foo', './dir', '--no-install'])).toEqual({
		command: 'new',
		positionals: ['./dir'],
		flags: new Set(['--no-install']),
		options: new Map([['--name', 'foo']]),
	})
	expect(() => parseArgs(['new', '--name'])).toThrow(/needs a value/)
	expect(parseArgs([]).command).toBeUndefined()
})

test('sync reports a managed file with no recorded base instead of skipping it', async () => {
	const dir = await tmp('nobase')
	const root = path.join(dir, 'repo')
	const templates = path.join(dir, 'templates')
	try {
		await mkdir(root)
		await fakeTemplates(templates, { 'managed/a.md': 'v2\n' })
		await writeFile(path.join(root, 'managed/a.md'), 'v1\n').catch(async () => {
			await mkdir(path.join(root, 'managed'))
			await writeFile(path.join(root, 'managed/a.md'), 'v1\n')
		})
		const report = await syncTemplates(
			root,
			{ name: 'x' },
			{ templatesDir: templates },
		)
		expect(report.missingBase).toEqual(['managed/a.md'])
		expect(await readFile(path.join(root, 'managed/a.md'), 'utf8')).toBe('v1\n')
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test('adopt works in a repo with no package.json and keeps 2-space indentation', async () => {
	const root = await tmp('adopt-bare')
	try {
		const result = adoptRepo(root, { name: 'bare' })
		expect(result.name).toBe('bare')
		const pkg = JSON.parse(
			await readFile(path.join(root, 'package.json'), 'utf8'),
		)
		expect(pkg.scripts.prepare).toBe('husky')
		expect(pkg.devDependencies.husky).toBeDefined()
		const spaced = patchPackageJson('{\n  "name": "x"\n}\n')
		expect(spaced.source.startsWith('{\n  "name"')).toBe(true)
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})

test('doc link check can ignore mirrored paths', async () => {
	const root = await tmp('links')
	try {
		await mkdir(path.join(root, 'mirror'))
		await writeFile(path.join(root, 'mirror/a.md'), '[x](./missing.md)')
		expect((await checkDocLinks(root)).issues).toHaveLength(1)
		expect((await checkDocLinks(root, ['mirror/'])).issues).toEqual([])
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})
