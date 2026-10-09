import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { packageRoot } from '../lib/repo.ts'

function run(command: string, args: Array<string>, cwd: string) {
	const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
	return {
		code: result.status,
		out: `${result.stdout}\n${result.stderr}`,
	}
}

// The harness uses itself: pack the package, create a product with the packed
// CLI, install the tarball into the product, and run the product's own gate,
// which calls `npx harness check` from node_modules. Unit tests run the source;
// only this proves the package as installed.
test('a product built from the packed package passes its own validate', async () => {
	const dir = await mkdtemp(path.join(tmpdir(), 'harness-e2e-'))
	try {
		const pack = run('npm', ['pack', '--pack-destination', dir], packageRoot)
		expect(pack.code, pack.out).toBe(0)
		const tarball = (await readdir(dir)).find((f) => f.endsWith('.tgz'))!
		expect(tarball).toBeDefined()

		const cli = path.join(packageRoot, 'dist/bin/harness.js')
		expect(existsSync(cli), 'npm pack should have built dist/').toBe(true)
		const product = path.join(dir, 'demo-product')
		const created = run(
			'node',
			[cli, 'new', product, '--no-install', '--no-git'],
			dir,
		)
		expect(created.code, created.out).toBe(0)

		const pkgFile = path.join(product, 'package.json')
		const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
		pkg.devDependencies['@dom-kelly/harness'] =
			`file:${path.join(dir, tarball)}`
		writeFileSync(pkgFile, `${JSON.stringify(pkg, null, '\t')}\n`)

		const install = run('npm', ['install', '--no-audit', '--no-fund'], product)
		expect(install.code, install.out).toBe(0)

		const helpText = run('npx', ['harness', '--help'], product)
		expect(helpText.code, helpText.out).toBe(0)
		expect(helpText.out).toContain('harness sync')

		const format = run('npx', ['prettier', '--check', '.'], product)
		expect(format.code, format.out).toBe(0)
		const validate = run('npm', ['run', '-s', 'validate'], product)
		expect(validate.code, validate.out).toBe(0)

		const sync = run('npx', ['harness', 'sync', '--check'], product)
		expect(sync.code, sync.out).toBe(0)

		const guard = spawnSync('npx', ['harness', 'hook', 'guard-bash'], {
			cwd: product,
			encoding: 'utf8',
			input: JSON.stringify({
				tool_input: { command: 'git push origin main' },
			}),
		})
		expect(guard.status).toBe(2)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})
