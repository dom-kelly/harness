import { existsSync } from 'node:fs'
import path from 'node:path'
import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	repoRoot,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

const linkPattern = /\[[^\]]*\]\(([^)\s]+)\)/g

export function extractRelativeLinks(source: string) {
	const links: Array<{ target: string; line: number }> = []
	let inFence = false
	source.split('\n').forEach((text, index) => {
		if (text.trimStart().startsWith('```')) inFence = !inFence
		if (inFence) return
		for (const match of text.replace(/<!--.*?-->/g, '').matchAll(linkPattern)) {
			const target = match[1]!.split('#')[0]!
			if (!target || /^[a-z]+:/i.test(target)) continue
			links.push({ target, line: index + 1 })
		}
	})
	return links
}

async function main() {
	const files = await listFiles(
		'.',
		(f) => f.endsWith('.md') && !f.startsWith('node_modules/'),
	)
	const issues: Array<CheckIssue> = []
	for (const file of files) {
		const source = await readRepoFile(file)
		for (const { target, line } of extractRelativeLinks(source)) {
			const resolved = path.resolve(repoRoot, path.dirname(file), target)
			if (!existsSync(resolved)) {
				issues.push({ file, line, message: `broken link → ${target}` })
			}
		}
	}
	reportAndExit(
		'markdown links',
		issues,
		'Fix the path or remove the link. Docs that point nowhere mislead the next agent.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
