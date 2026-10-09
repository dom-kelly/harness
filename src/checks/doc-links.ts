import { existsSync } from 'node:fs'
import { realpath } from 'node:fs/promises'
import path from 'node:path'
import {
	listFiles,
	readRepoFile,
	type CheckIssue,
	type CheckResult,
} from '../lib/repo.ts'

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

export async function checkDocLinks(
	root: string,
	ignore: ReadonlyArray<string> = [],
): Promise<CheckResult> {
	const files = await listFiles(
		root,
		'.',
		(f) => f.endsWith('.md') && !ignore.some((p) => f.startsWith(p)),
	)
	const issues: Array<CheckIssue> = []
	for (const file of files) {
		const source = await readRepoFile(root, file)
		// A symlinked file's links are relative to where it really lives.
		const realDir = path.dirname(await realpath(path.join(root, file)))
		for (const { target, line } of extractRelativeLinks(source)) {
			const resolved = path.resolve(realDir, target)
			if (!existsSync(resolved)) {
				issues.push({ file, line, message: `broken link → ${target}` })
			}
		}
	}
	return {
		name: 'markdown links',
		issues,
		remediation:
			'Fix the path or remove the link. Docs that point nowhere mislead the next agent.',
	}
}
