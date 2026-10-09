import { expect, test } from 'vitest'
import { findDecisionIssues } from './check-decisions.ts'
import { extractRelativeLinks } from './check-doc-links.ts'
import { findSkillIssues } from './check-skills.ts'
import {
	classifyFiles,
	validateMap,
	type PrimitivesMap,
} from './classify-primitives.ts'
import { isDocsOnly } from './git-hook-checks.ts'

test('decision records reject duplicates and unindexed files', () => {
	const issues = findDecisionIssues(
		['index.md', '0000-template.md', '0001-a.md', '0001-b.md', '0002-c-lab.md'],
		'./0001-a.md ./0001-b.md',
	)
	expect(issues.map((i) => i.message)).toEqual([
		'duplicate number 0001 (also 0001-a.md)',
		'not linked from decisions/index.md',
	])
})

test('relative links are extracted, urls and anchors skipped', () => {
	const links = extractRelativeLinks(
		'[a](./x.md#h) [b](https://x.dev) [c](#top)',
	)
	expect(links).toEqual([{ target: './x.md', line: 1 }])
})

test('skills need matching name and a real description', () => {
	const ok = `---\nname: demo\ndescription: Does a thing. Use when the user asks for the thing to happen.\n---\n# Demo`
	expect(findSkillIssues('.claude/skills/demo/SKILL.md', ok)).toEqual([])
	expect(findSkillIssues('.claude/skills/other/SKILL.md', ok)).toHaveLength(1)
})

const map: PrimitivesMap = {
	version: 1,
	groups: [{ id: 'g', name: 'G' }],
	primitives: [
		{ id: 'app', group: 'g', name: 'App', summary: '', code: ['src'] },
		{ id: 'api', group: 'g', name: 'API', summary: '', code: ['src/api'] },
	],
}

test('classification uses the longest matching root', () => {
	const { touched, unowned } = classifyFiles(map, [
		'src/api/x.ts',
		'src/y.ts',
		'README.md',
	])
	expect(Object.fromEntries(touched)).toEqual({
		api: ['src/api/x.ts'],
		app: ['src/y.ts'],
	})
	expect(unowned).toEqual(['README.md'])
})

test('map validation reports unknown groups', () => {
	const bad = { ...map, primitives: [{ ...map.primitives[0]!, group: 'nope' }] }
	expect(validateMap(bad, []).map((i) => i.message)).toContain(
		'app: unknown group nope',
	)
})

test('docs-only detection', () => {
	expect(isDocsOnly(['docs/a.md', 'README.md'])).toBe(true)
	expect(isDocsOnly(['docs/a.md', 'src/x.ts'])).toBe(false)
	expect(isDocsOnly([])).toBe(false)
})

test('links inside html comments are ignored', () => {
	expect(extractRelativeLinks('<!-- see [x](./missing.md) -->')).toEqual([])
})

test('decision headings must match their number', () => {
	const issues = findDecisionIssues(
		['index.md', '0003-x.md'],
		'./0003-x.md',
		new Map([['0003-x.md', '# 0004: wrong']]),
	)
	expect(issues.map((i) => i.message)).toEqual([
		'first heading must start with "# 0003:"',
	])
})

test('primitives reference known invariant ids with short summaries', () => {
	const bad = {
		...map,
		invariants: [{ id: 'known', statement: 's' }],
		primitives: [
			{
				...map.primitives[0]!,
				invariants: ['missing'],
				summary: 'x'.repeat(121),
			},
		],
	}
	expect(validateMap(bad, []).map((i) => i.message)).toEqual([
		'app: summary must be one line, at most 120 chars',
		'app: unknown invariant id missing',
	])
})

test('git hooks require the node major in .nvmrc', async () => {
	const { nodeVersionIssue } = await import('./git-hook-checks.ts')
	expect(nodeVersionIssue('22.22.0', '22\n')).toBeUndefined()
	expect(nodeVersionIssue('22.9.0', '22')).toMatch(/>= 22.18/)
	expect(nodeVersionIssue('23.6.1', '22')).toMatch(/have 23.6.1/)
	expect(nodeVersionIssue('24.1.0', 'v24.1')).toBeUndefined()
	expect(nodeVersionIssue('24.0.5', '24.1')).toBeDefined()
})

test('pre-push input skips deleted refs', async () => {
	const { parsePrePushInput } = await import('./git-hook-checks.ts')
	const zero = '0'.repeat(40)
	const a = 'a'.repeat(40)
	const b = 'b'.repeat(40)
	const input = `refs/heads/x ${a} refs/heads/x ${b}\n(delete) ${zero} refs/heads/y ${a}\n`
	expect(parsePrePushInput(input)).toEqual([{ localSha: a, remoteSha: b }])
})

test('guard hook blocks force push, no-verify, and destructive resets', async () => {
	const { findBlockedReason } = await import('./claude-hooks/guard-bash.ts')
	expect(findBlockedReason('git push --force origin x')).toBeDefined()
	expect(findBlockedReason('git push -f')).toBeDefined()
	expect(
		findBlockedReason('git push origin x --force-with-lease'),
	).toBeDefined()
	expect(findBlockedReason('git commit -m x --no-verify')).toBeDefined()
	expect(findBlockedReason('git reset --hard HEAD~1')).toBeDefined()
	expect(findBlockedReason('git push origin feature')).toBeUndefined()
	expect(findBlockedReason('git status')).toBeUndefined()
})
