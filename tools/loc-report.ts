import { isExecutedDirectly, listFiles, readRepoFile } from './lib/repo.ts'

const countedExtensions = /\.(ts|tsx|js|mjs|css|sql)$/

export function summarizeLines(lineCounts: ReadonlyMap<string, number>) {
	const totals = { source: 0, tests: 0, tools: 0 }
	for (const [file, lines] of lineCounts) {
		if (file.endsWith('.test.ts')) totals.tests += lines
		else if (file.startsWith('tools/')) totals.tools += lines
		else totals.source += lines
	}
	return { ...totals, total: totals.source + totals.tests + totals.tools }
}

async function main() {
	const files = await listFiles('.', (f) => countedExtensions.test(f))
	const counts = new Map<string, number>()
	for (const file of files) {
		counts.set(file, (await readRepoFile(file)).split('\n').length)
	}
	const summary = summarizeLines(counts)
	if (process.argv.includes('--json')) {
		console.log(JSON.stringify(summary))
		return
	}
	for (const [key, value] of Object.entries(summary)) {
		console.log(`${key.padEnd(8)} ${value}`)
	}
}

if (isExecutedDirectly(import.meta.url)) await main()
