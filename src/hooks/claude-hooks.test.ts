import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { runNpmScript } from './claude-hooks.ts'

// Git exports an absolute GIT_DIR to hooks run from a worktree. The test suite
// run by pre-push then did `git init` in a temp dir and committed into the
// real repo.
test('an npm script run by a hook does not inherit GIT_DIR', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'harness-hook-env-'))
	const saved = process.env.GIT_DIR
	process.env.GIT_DIR = '/nowhere/.git'
	try {
		await writeFile(
			path.join(root, 'package.json'),
			JSON.stringify({ scripts: { show: 'echo "dir=[$GIT_DIR]"' } }),
		)
		const { status, output } = runNpmScript(root, 'show')
		expect(status, output).toBe(0)
		expect(output).toContain('dir=[]')
	} finally {
		if (saved === undefined) delete process.env.GIT_DIR
		else process.env.GIT_DIR = saved
		await rm(root, { recursive: true, force: true })
	}
})
