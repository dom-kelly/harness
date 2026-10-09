import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { listFiles, type CheckIssue, type CheckResult } from '../lib/repo.ts'

export const mapPath = 'docs/contributing/architecture/primitives.yaml'

export const riskLevels = ['low', 'medium', 'high'] as const
export type Risk = (typeof riskLevels)[number]

export type Primitive = {
	id: string
	group: string
	name: string
	summary: string
	code: Array<string>
	docs?: Array<string>
	invariants?: Array<string>
	/** The lowest risk any change touching this primitive can have. */
	floor?: Risk
}

export type PrimitivesMap = {
	version: number
	/** Roots whose files must all be owned. Default ["src"]. */
	scan?: Array<string>
	/** Path prefixes that belong to no primitive (docs, tests). */
	unowned?: Array<string>
	/** File suffixes that belong to no primitive (test files). */
	unowned_suffixes?: Array<string>
	invariants?: Array<{ id: string; statement: string }>
	groups: Array<{ id: string; name: string }>
	primitives: Array<Primitive>
}

export function loadMap(root: string): PrimitivesMap {
	return parse(readFileSync(path.join(root, mapPath), 'utf8'))
}

function matches(file: string, root: string) {
	const prefix = root.endsWith('/') ? root : `${root}/`
	return file === root || file.startsWith(prefix)
}

export type Classification = {
	touched: Map<string, Array<string>>
	unowned: Array<string>
	excluded: Array<string>
}

/** Longest matching root wins, whether it is a primitive's code root or an
 *  `unowned` prefix; `unowned_suffixes` always win. */
export function classifyFiles(
	map: PrimitivesMap,
	files: ReadonlyArray<string>,
): Classification {
	const touched = new Map<string, Array<string>>()
	const unowned: Array<string> = []
	const excluded: Array<string> = []
	for (const file of files) {
		if ((map.unowned_suffixes ?? []).some((s) => file.endsWith(s))) {
			excluded.push(file)
			continue
		}
		const unownedLength = Math.max(
			-1,
			...(map.unowned ?? [])
				.filter((p) => matches(file, p))
				.map((p) => p.length),
		)
		let best: { id: string; length: number } | undefined
		for (const primitive of map.primitives) {
			for (const root of primitive.code) {
				if (matches(file, root) && (!best || root.length > best.length)) {
					best = { id: primitive.id, length: root.length }
				}
			}
		}
		if (best && best.length > unownedLength) {
			touched.set(best.id, [...(touched.get(best.id) ?? []), file])
		} else if (unownedLength >= 0) {
			excluded.push(file)
		} else {
			unowned.push(file)
		}
	}
	return { touched, unowned, excluded }
}

/** The highest floor among touched primitives; unmapped code is high. */
export function riskFloor(
	map: PrimitivesMap,
	{ touched, unowned }: Classification,
): Risk {
	let floor: Risk = unowned.length ? 'high' : 'low'
	for (const id of touched.keys()) {
		const level = map.primitives.find((p) => p.id === id)?.floor ?? 'low'
		if (riskLevels.indexOf(level) > riskLevels.indexOf(floor)) floor = level
	}
	return floor
}

export function validateMap(
	map: PrimitivesMap,
	root: string,
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
		if (p.floor !== undefined && !riskLevels.includes(p.floor)) {
			issues.push({
				file: mapPath,
				message: `${p.id}: floor must be low, medium or high`,
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
		for (const target of [...p.code, ...(p.docs ?? [])]) {
			if (!existsSync(path.join(root, target))) {
				issues.push({
					file: mapPath,
					message: `${p.id}: path ${target} does not exist`,
				})
			}
		}
	}
	for (const file of classifyFiles(map, sourceFiles).unowned) {
		issues.push({
			file,
			message: `no primitive owns this file; add a code root or an unowned prefix in ${mapPath}`,
		})
	}
	return issues
}

export async function checkPrimitives(root: string): Promise<CheckResult> {
	const name = 'primitives map'
	const remediation =
		'Keep primitives.yaml a small, accurate taxonomy: every scanned file has an owner, every path exists.'
	if (!existsSync(path.join(root, mapPath))) {
		return {
			name,
			issues: [{ file: mapPath, message: 'missing' }],
			remediation,
		}
	}
	const map = loadMap(root)
	const files: Array<string> = []
	for (const scanRoot of map.scan ?? ['src']) {
		files.push(...(await listFiles(root, scanRoot, () => true)))
	}
	return { name, issues: validateMap(map, root, files), remediation }
}

export function changedFiles(root: string, base: string) {
	return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
		cwd: root,
		encoding: 'utf8',
	})
		.split('\n')
		.filter(Boolean)
}

export type ChangeSummary = {
	floor: Risk
	primitives: Array<{
		id: string
		name: string
		group: string
		floor: Risk
		invariants: Array<string>
		files: Array<string>
	}>
	unowned: Array<string>
}

export function summarizeChanges(
	map: PrimitivesMap,
	files: ReadonlyArray<string>,
): ChangeSummary {
	const classification = classifyFiles(map, files)
	return {
		floor: riskFloor(map, classification),
		primitives: [...classification.touched].map(([id, list]) => {
			const p = map.primitives.find((x) => x.id === id)!
			return {
				id,
				name: p.name,
				group: p.group,
				floor: p.floor ?? 'low',
				invariants: p.invariants ?? [],
				files: list,
			}
		}),
		unowned: classification.unowned,
	}
}

export function formatChangeSummary(
	map: PrimitivesMap,
	summary: ChangeSummary,
) {
	const lines = [`**Primitives touched** (risk floor: ${summary.floor})`, '']
	if (!summary.primitives.length && !summary.unowned.length) {
		lines.push('- none (docs, tests or unowned paths only)')
	}
	const statements = new Map(
		(map.invariants ?? []).map((i) => [i.id, i.statement]),
	)
	for (const p of summary.primitives) {
		lines.push(`- **${p.id}** — ${p.name} (floor ${p.floor})`)
		for (const id of p.invariants) {
			lines.push(`  - invariant \`${id}\`: ${statements.get(id) ?? ''}`)
		}
	}
	for (const file of summary.unowned) {
		lines.push(`- unowned: \`${file}\` — add it to ${mapPath}`)
	}
	return lines.join('\n')
}
