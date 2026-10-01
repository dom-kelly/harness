import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { checkMermaidSource } from './check-mermaid.ts'
import { isExecutedDirectly, repoRoot } from './lib/repo.ts'

const startMarker = '<!-- recap:start -->'
const endMarker = '<!-- recap:end -->'

export function upsertRecap(body: string, block: string) {
	const trimmed = block.trim()
	if (!trimmed.startsWith(startMarker) || !trimmed.endsWith(endMarker)) {
		throw new Error(
			`Recap block must start with ${startMarker} and end with ${endMarker}`,
		)
	}
	const start = body.indexOf(startMarker)
	const end = body.indexOf(endMarker)
	if (start >= 0 && end > start) {
		return body.slice(0, start) + trimmed + body.slice(end + endMarker.length)
	}
	const heading = '## System changes'
	const headingIndex = body.indexOf(heading)
	if (headingIndex >= 0) {
		const insertAt = headingIndex + heading.length
		return `${body.slice(0, insertAt)}\n\n${trimmed}\n${body.slice(insertAt)}`
	}
	return `${body.trimEnd()}\n\n${heading}\n\n${trimmed}\n`
}

async function main() {
	const args = process.argv.slice(2)
	const pr = args[args.indexOf('--pr') + 1]
	const file = args[args.indexOf('--file') + 1]
	if (!args.includes('--pr') || !args.includes('--file') || !pr || !file) {
		console.error(
			'Usage: node tools/upsert-recap-block.ts --pr <number> --file <recap.md>',
		)
		process.exit(1)
	}
	const block = readFileSync(file, 'utf8')
	const issues = await checkMermaidSource(file, block)
	if (issues.length > 0) {
		for (const issue of issues)
			console.error(`${issue.file}:${issue.line} ${issue.message}`)
		process.exit(1)
	}
	const body = JSON.parse(
		execFileSync('gh', ['pr', 'view', pr, '--json', 'body'], {
			encoding: 'utf8',
		}),
	).body as string
	const bodyPath = path.join(repoRoot, '.tmp', 'pr-body.md')
	mkdirSync(path.dirname(bodyPath), { recursive: true })
	writeFileSync(bodyPath, upsertRecap(body, block))
	execFileSync('gh', ['pr', 'edit', pr, '--body-file', bodyPath], {
		stdio: 'inherit',
	})
	console.log(`Updated recap on PR #${pr}`)
}

if (isExecutedDirectly(import.meta.url)) await main()
