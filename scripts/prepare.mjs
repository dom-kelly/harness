// Runs on `npm install` in this repo and when a product installs the package
// from git. Node refuses to strip TypeScript types under node_modules, so the
// CLI is compiled to dist/. Git hooks are installed only in a checkout.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function run(command, args) {
	const result = spawnSync(command, args, { stdio: 'inherit' })
	if (result.status !== 0) process.exit(result.status ?? 1)
}

if (existsSync('.git')) run('npx', ['husky'])
run('npx', ['tsc', '-p', 'tsconfig.build.json'])
