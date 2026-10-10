import path from 'node:path'
import { parse } from 'yaml'
import {
	listFiles,
	readRepoFile,
	type CheckIssue,
	type CheckResult,
} from '../lib/repo.ts'

const maxSkillLines = 250
const maxDescriptionLength = 1024
export const skillDirs = ['.claude/skills', '.agents/skills']

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

export async function checkSkills(root: string): Promise<CheckResult> {
	const issues: Array<CheckIssue> = []
	for (const dir of skillDirs) {
		const files = await listFiles(root, dir, (f) => f.endsWith('/SKILL.md'))
		for (const file of files) {
			issues.push(...findSkillIssues(file, await readRepoFile(root, file)))
		}
	}
	return {
		name: 'skills',
		issues,
		remediation:
			'A skill is a thin workflow: frontmatter name = folder, a description that says what and when, under 250 lines.',
	}
}
