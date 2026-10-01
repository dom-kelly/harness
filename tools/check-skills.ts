import path from 'node:path'
import { parse } from 'yaml'
import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

const maxSkillLines = 250
const maxDescriptionLength = 1024

export function findSkillIssues(file: string, source: string) {
	const issues: Array<CheckIssue> = []
	const match = /^---\n([\s\S]*?)\n---\n/.exec(source)
	if (!match) {
		return [{ file, message: 'missing YAML frontmatter' }]
	}
	const frontmatter = parse(match[1]!) as Record<string, unknown> | null
	const dirName = path.posix.basename(path.posix.dirname(file))
	if (frontmatter?.name !== dirName) {
		issues.push({ file, message: `frontmatter name must equal "${dirName}"` })
	}
	const description = frontmatter?.description
	if (typeof description !== 'string' || description.trim().length < 40) {
		issues.push({
			file,
			message: 'description must say what the skill does and when to use it',
		})
	} else if (description.length > maxDescriptionLength) {
		issues.push({
			file,
			message: `description over ${maxDescriptionLength} chars`,
		})
	}
	const lineCount = source.split('\n').length
	if (lineCount > maxSkillLines) {
		issues.push({
			file,
			message: `${lineCount} lines (max ${maxSkillLines}); move detail into references/ or docs`,
		})
	}
	return issues
}

async function main() {
	const files = await listFiles('.claude/skills', (f) =>
		f.endsWith('/SKILL.md'),
	)
	const issues: Array<CheckIssue> = []
	for (const file of files) {
		issues.push(...findSkillIssues(file, await readRepoFile(file)))
	}
	reportAndExit(
		'skills',
		issues,
		'Keep skills thin: frontmatter name = folder, a trigger-rich description, detail in docs.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
