import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

export const exemptPrefixes = ['docs/contributing/decisions/', 'docs/audits/']
export const exemptFiles = new Set(['docs/contributing/documentation.md'])

export const temporalPatterns: ReadonlyArray<{ label: string; regex: RegExp }> =
	[
		{ label: 'now we', regex: /\bnow we\b/i },
		{ label: 'we now', regex: /\bwe now\b/i },
		{ label: 'we no longer', regex: /\bwe no longer\b/i },
		{ label: 'previously we', regex: /\bpreviously,? we\b/i },
		{ label: 'formerly we', regex: /\bformerly,? we\b/i },
		{ label: 'as before', regex: /\bas before\b/i },
		{ label: 'was/were removed', regex: /\b(?:was|were) removed\b/i },
		{
			label: 'recently changed',
			regex: /\brecently (?:changed|added|removed|moved|renamed)\b/i,
		},
		{ label: 'new in this release', regex: /\bnew in (?:this|the latest)\b/i },
	]

const rootDocs = new Set(['CLAUDE.md', 'AGENTS.md', 'README.md'])

export function isAgentFacing(file: string) {
	return (
		rootDocs.has(file) ||
		file.startsWith('docs/') ||
		file.startsWith('.claude/')
	)
}

export function findTemporalLanguage(file: string, source: string) {
	const issues: Array<CheckIssue> = []
	let inFence = false
	source.split('\n').forEach((text, index) => {
		if (text.trimStart().startsWith('```')) inFence = !inFence
		if (inFence) return
		for (const { label, regex } of temporalPatterns) {
			if (regex.test(text)) {
				issues.push({
					file,
					line: index + 1,
					message: `changelog wording "${label}"`,
				})
			}
		}
	})
	return issues
}

async function main() {
	const files = await listFiles(
		'.',
		(f) =>
			f.endsWith('.md') &&
			isAgentFacing(f) &&
			!exemptFiles.has(f) &&
			!exemptPrefixes.some((p) => f.startsWith(p)),
	)
	const issues: Array<CheckIssue> = []
	for (const file of files) {
		issues.push(...findTemporalLanguage(file, await readRepoFile(file)))
	}
	reportAndExit(
		'docs temporal language',
		issues,
		'Docs describe how the system works today. Move history to the PR description or a decision record.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
