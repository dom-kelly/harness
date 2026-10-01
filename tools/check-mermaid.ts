import { registerHooks } from 'node:module'
import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

type MermaidBlock = { line: number; code: string; closed: boolean }

export function extractMermaidBlocks(source: string): Array<MermaidBlock> {
	const lines = source.split(/\r?\n/)
	const blocks: Array<MermaidBlock> = []
	for (let index = 0; index < lines.length; index++) {
		const open = /^\s{0,3}(`{3,}|~{3,})\s*mermaid\b/i.exec(lines[index]!)
		if (!open) continue
		const fence = open[1]!
		const start = index + 1
		const body: Array<string> = []
		let closed = false
		for (index++; index < lines.length; index++) {
			const text = lines[index]!
			if (
				text.trim().startsWith(fence) &&
				text.trim() === text.trim()[0]!.repeat(text.trim().length)
			) {
				closed = true
				break
			}
			body.push(text)
		}
		blocks.push({ line: start, code: body.join('\n'), closed })
	}
	return blocks
}

let parserPromise: Promise<(code: string) => Promise<unknown>> | undefined

function loadParser() {
	parserPromise ??= (async () => {
		registerHooks({
			load(url, context, nextLoad) {
				if (!url.includes('/node_modules/dompurify/')) {
					return nextLoad(url, context)
				}
				return {
					format: 'module',
					shortCircuit: true,
					source:
						'export default { sanitize: (t) => String(t ?? ""), addHook() {}, removeHook() {}, removeHooks() {}, removeAllHooks() {}, isSupported: true }',
				}
			},
		})
		const { default: mermaid } = await import('mermaid')
		mermaid.initialize({ startOnLoad: false, logLevel: 'fatal' })
		return (code: string) => mermaid.parse(code)
	})()
	return parserPromise
}

export async function checkMermaidSource(file: string, source: string) {
	const issues: Array<CheckIssue> = []
	for (const block of extractMermaidBlocks(source)) {
		if (!block.closed) {
			issues.push({ file, line: block.line, message: 'unclosed mermaid fence' })
			continue
		}
		if (!block.code.trim()) {
			issues.push({ file, line: block.line, message: 'empty mermaid diagram' })
			continue
		}
		try {
			const parse = await loadParser()
			await parse(block.code.trim())
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			issues.push({
				file,
				line: block.line,
				message: `mermaid parse error: ${message.split('\n').slice(0, 3).join(' ').replace(/\s+/g, ' ')}`,
			})
		}
	}
	return issues
}

async function main() {
	const args = process.argv.slice(2)
	const issues: Array<CheckIssue> = []
	if (args.includes('--stdin')) {
		const chunks: Array<Buffer> = []
		for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
		issues.push(
			...(await checkMermaidSource(
				'<stdin>',
				Buffer.concat(chunks).toString('utf8'),
			)),
		)
	} else {
		const files = await listFiles('.', (f) => f.endsWith('.md'))
		for (const file of files) {
			issues.push(...(await checkMermaidSource(file, await readRepoFile(file))))
		}
	}
	reportAndExit(
		'mermaid diagrams',
		issues,
		'Fix the diagram syntax. GitHub shows "Unable to render" for these; test at https://mermaid.live.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
