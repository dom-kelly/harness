import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import {
	isExecutedDirectly,
	listFiles,
	repoRoot,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

const mapPath = 'docs/contributing/architecture/primitives.yaml'

type Primitive = {
	id: string
	group: string
	name: string
	summary: string
	code: Array<string>
	docs?: Array<string>
	invariants?: Array<string>
}

export type PrimitivesMap = {
	version: number
	invariants?: Array<{ id: string; statement: string }>
	groups: Array<{ id: string; name: string }>
	primitives: Array<Primitive>
}

export function loadMap(): PrimitivesMap {
	return parse(readFileSync(path.join(repoRoot, mapPath), 'utf8'))
}

export function classifyFiles(
	map: PrimitivesMap,
	files: ReadonlyArray<string>,
) {
	const touched = new Map<string, Array<string>>()
	const unowned: Array<string> = []
	for (const file of files) {
		let best: { id: string; length: number } | undefined
		for (const primitive of map.primitives) {
			for (const root of primitive.code) {
				if (
					file === root ||
					file.startsWith(root.endsWith('/') ? root : `${root}/`)
				) {
					if (!best || root.length > best.length) {
						best = { id: primitive.id, length: root.length }
					}
				}
			}
		}
		if (best) touched.set(best.id, [...(touched.get(best.id) ?? []), file])
		else unowned.push(file)
	}
	return { touched, unowned }
}

export function validateMap(
	map: PrimitivesMap,
	sourceFiles: ReadonlyArray<string>,
) {
	const issues: Array<CheckIssue> = []
	const groupIds = new Set(map.groups.map((g) => g.id))
	const invariantIds = new Set((map.invariants ?? []).map((i) => i.id))
	const ids = new Set<string>()
	for (const p of map.primitives) {
		if (ids.has(p.id))
			issues.push({ file: mapPath, message: `duplicate id ${p.id}` })
		ids.add(p.id)
		if (p.summary.includes('\n') || p.summary.length > 120) {
			issues.push({
				file: mapPath,
				message: `${p.id}: summary must be one line, at most 120 chars`,
			})
		}
		for (const invariant of p.invariants ?? []) {
			if (!invariantIds.has(invariant)) {
				issues.push({
					file: mapPath,
					message: `${p.id}: unknown invariant id ${invariant}`,
				})
			}
		}
		if (!groupIds.has(p.group)) {
			issues.push({
				file: mapPath,
				message: `${p.id}: unknown group ${p.group}`,
			})
		}
		for (const root of [...p.code, ...(p.docs ?? [])]) {
			if (!existsSync(path.join(repoRoot, root))) {
				issues.push({
					file: mapPath,
					message: `${p.id}: path ${root} does not exist`,
				})
			}
		}
	}
	for (const file of classifyFiles(map, sourceFiles).unowned) {
		issues.push({
			file,
			message: `no primitive owns this file; add a code root in ${mapPath}`,
		})
	}
	return issues
}

function changedFiles(base: string) {
	return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
		cwd: repoRoot,
		encoding: 'utf8',
	})
		.split('\n')
		.filter(Boolean)
}

async function main() {
	const map = loadMap()
	const args = process.argv.slice(2)
	if (args.includes('--check')) {
		const sourceFiles = await listFiles('src', (f) => f.endsWith('.ts'))
		reportAndExit(
			'primitives map',
			validateMap(map, sourceFiles),
			'Keep primitives.yaml a small, accurate taxonomy: every src file has an owner, every path exists.',
		)
		return
	}
	const baseIndex = args.indexOf('--base')
	const base = baseIndex >= 0 ? args[baseIndex + 1]! : 'origin/main'
	const files = args.includes('--stdin')
		? readFileSync(0, 'utf8').split('\n').filter(Boolean)
		: changedFiles(base)
	const { touched, unowned } = classifyFiles(map, files)
	const result = {
		primitives: [...touched].map(([id, list]) => {
			const p = map.primitives.find((x) => x.id === id)!
			return {
				id,
				name: p.name,
				group: p.group,
				invariants: p.invariants ?? [],
				files: list,
			}
		}),
		unowned,
	}
	console.log(JSON.stringify(result, null, 2))
}

if (isExecutedDirectly(import.meta.url)) await main()
