import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { packageVersion, readConfig, writeConfig } from '../lib/config.ts'
import { applyTemplates, type ApplyReport } from '../lib/templates.ts'

export const dependencyName = '@dom-kelly/harness'
export const dependencySpec = 'github:dom-kelly/harness'

type PackageJson = {
	name?: string
	scripts?: Record<string, string>
	devDependencies?: Record<string, string>
}

/** Adds the harness to an existing package.json without touching what's there.
 *  Returns the keys it added. */
export function patchPackageJson(source: string) {
	const pkg = JSON.parse(source) as PackageJson
	const added: Array<string> = []
	pkg.devDependencies ??= {}
	if (!pkg.devDependencies[dependencyName]) {
		pkg.devDependencies[dependencyName] = dependencySpec
		added.push(`devDependencies.${dependencyName}`)
	}
	pkg.scripts ??= {}
	for (const [key, value] of Object.entries({
		harness: 'harness',
		'harness:check': 'harness check',
	})) {
		if (!pkg.scripts[key]) {
			pkg.scripts[key] = value
			added.push(`scripts.${key}`)
		}
	}
	return { source: `${JSON.stringify(pkg, null, '\t')}\n`, added, pkg }
}

/** harness adopt: apply the templates to an existing repo, keeping every file
 *  that already exists, and record it in harness.json. */
export function adoptRepo(root: string, { name }: { name?: string } = {}) {
	const pkgFile = path.join(root, 'package.json')
	const pkgSource = existsSync(pkgFile) ? readFileSync(pkgFile, 'utf8') : '{}\n'
	const patched = patchPackageJson(pkgSource)
	const productName = name ?? patched.pkg.name ?? path.basename(root)
	const report: ApplyReport = applyTemplates(
		root,
		{ name: productName },
		{ overwrite: false },
	)
	writeFileSync(pkgFile, patched.source)
	const existing = readConfig(root)
	writeConfig(root, {
		...existing,
		harness: packageVersion,
		product: existing?.product ?? { name: productName },
	})
	return { report, packageAdded: patched.added, name: productName }
}

export function formatAdoptReport(result: ReturnType<typeof adoptRepo>) {
	const lines = [
		`adopt: ${result.name} now uses the harness (harness.json written)`,
		`  written: ${result.report.written.length} file(s)`,
		`  kept as-is (yours; sync will merge future template changes into them): ${result.report.kept.length} file(s)`,
	]
	if (result.packageAdded.length) {
		lines.push(`  package.json: added ${result.packageAdded.join(', ')}`)
	}
	lines.push(
		'',
		'Next:',
		'  1. npm install',
		'  2. add `npx harness check` to your validate/verify script',
		'  3. review .claude/settings.json and .husky/* (they call `npx harness hook …`)',
		'  4. fill docs/contributing/architecture/primitives.yaml for your code (scan, floors, invariants)',
		'  5. commit, including .harness/base/',
	)
	return lines.join('\n')
}
