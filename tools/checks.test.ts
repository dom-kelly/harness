import { expect, test } from 'vitest'
import { findFeatureMapIssues } from './app-cli.ts'
import { findBanners } from './check-decorative-banners.ts'
import { findDecisionIssues } from './check-decisions.ts'
import { extractRelativeLinks } from './check-doc-links.ts'
import { findTemporalLanguage } from './check-docs-temporal.ts'
import { evaluateRatchet } from './check-file-size-ratchet.ts'
import { findSkillIssues } from './check-skills.ts'
import {
	classifyFiles,
	validateMap,
	type PrimitivesMap,
} from './classify-primitives.ts'
import { isDocsOnly } from './git-hook-checks.ts'

test('temporal language is flagged outside code fences', () => {
	const source = 'We now cache it.\n```\nwe now ignore\n```\nIt caches.'
	expect(findTemporalLanguage('a.md', source)).toEqual([
		{ file: 'a.md', line: 1, message: 'changelog wording "we now"' },
	])
})

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

test('banners are flagged', () => {
	expect(findBanners('a.ts', '// ======\nconst x = 1\n// note')).toHaveLength(1)
})

test('ratchet blocks new oversized files and stale snapshot entries', () => {
	const counts = new Map([
		['src/big.ts', 900],
		['src/ok.ts', 10],
	])
	const issues = evaluateRatchet(counts, { source: ['src/ok.ts'], tests: [] })
	expect(issues.map((i) => i.file)).toEqual(['src/big.ts', 'src/ok.ts'])
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

test('feature map catches unmapped routes', () => {
	const issues = findFeatureMapIssues(
		['GET /', 'GET /health', 'GET /extra'],
		() => true,
	)
	expect(issues.map((i) => i.message)).toEqual([
		'/extra is not in the feature map',
	])
})

test('links inside html comments are ignored', () => {
	expect(extractRelativeLinks('<!-- see [x](./missing.md) -->')).toEqual([])
})

test('loc summary splits source, tests, and tools', async () => {
	const { summarizeLines } = await import('./loc-report.ts')
	const counts = new Map([
		['src/a.ts', 10],
		['src/a.test.ts', 5],
		['tools/x.ts', 3],
	])
	expect(summarizeLines(counts)).toEqual({
		source: 10,
		tests: 5,
		tools: 3,
		total: 18,
	})
})

test('docs tense check covers agent-facing files only', async () => {
	const { isAgentFacing } = await import('./check-docs-temporal.ts')
	expect(isAgentFacing('CLAUDE.md')).toBe(true)
	expect(isAgentFacing('.claude/skills/x/SKILL.md')).toBe(true)
	expect(isAgentFacing('node_modules/x/README.md')).toBe(false)
	expect(findTemporalLanguage('a.md', 'It was previously cached.')).toEqual([])
	expect(findTemporalLanguage('a.md', 'Previously we cached it.')).toHaveLength(
		1,
	)
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

test('pre-push input skips deleted refs', async () => {
	const { parsePrePushInput } = await import('./git-hook-checks.ts')
	const zero = '0'.repeat(40)
	const a = 'a'.repeat(40)
	const b = 'b'.repeat(40)
	const input = `refs/heads/x ${a} refs/heads/x ${b}\n(delete) ${zero} refs/heads/y ${a}\n`
	expect(parsePrePushInput(input)).toEqual([{ localSha: a, remoteSha: b }])
})

const never = () => false

test('deployed sha matches exact, short, or descendant', async () => {
	const { isShaDeployed, meetsNodeVersion } = await import('./app-cli.ts')
	expect(isShaDeployed('abc1234', 'abc1234def', never)).toBe(true)
	expect(isShaDeployed('abc1234', 'fff0000', never)).toBe(false)
	expect(isShaDeployed('abc1234', 'fff0000', () => true)).toBe(true)
	expect(meetsNodeVersion('22.18.0')).toBe(true)
	expect(meetsNodeVersion('22.9.0')).toBe(false)
	expect(meetsNodeVersion('24.0.0')).toBe(true)
})

test('recap upsert replaces only the marked block', async () => {
	const { upsertRecap } = await import('./upsert-recap-block.ts')
	const block = '<!-- recap:start -->\nnew\n<!-- recap:end -->'
	const body = 'Intro\n<!-- recap:start -->\nold\n<!-- recap:end -->\nOutro'
	expect(upsertRecap(body, block)).toBe(`Intro\n${block}\nOutro`)
	expect(upsertRecap('## System changes\n', block)).toContain(
		`## System changes\n\n${block}`,
	)
	expect(() => upsertRecap(body, 'no markers')).toThrow()
})

test('mermaid blocks are extracted and validated', async () => {
	const { checkMermaidSource, extractMermaidBlocks } =
		await import('./check-mermaid.ts')
	const good = '```mermaid\nsequenceDiagram\n  A->>B: hi\n```'
	expect(extractMermaidBlocks(good)).toEqual([
		{ line: 1, code: 'sequenceDiagram\n  A->>B: hi', closed: true },
	])
	expect(await checkMermaidSource('a.md', good)).toEqual([])
	expect(
		await checkMermaidSource(
			'a.md',
			'```mermaid\nsequenceDiagram\n  A->>\n```',
		),
	).toHaveLength(1)
	expect(
		await checkMermaidSource('a.md', '```mermaid\nflowchart TD\n'),
	).toEqual([{ file: 'a.md', line: 1, message: 'unclosed mermaid fence' }])
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
