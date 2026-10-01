import {
	isExecutedDirectly,
	listFiles,
	readRepoFile,
	reportAndExit,
	type CheckIssue,
} from './lib/repo.ts'

const bannerPattern = /^\s*(?:\/\/|\/\*|\*|#)\s*[-=*#~]{4,}/

export function findBanners(file: string, source: string) {
	const issues: Array<CheckIssue> = []
	source.split('\n').forEach((text, index) => {
		if (bannerPattern.test(text)) {
			issues.push({
				file,
				line: index + 1,
				message: 'decorative comment banner',
			})
		}
	})
	return issues
}

async function main() {
	const files = await listFiles('.', (f) => /^(src|tools)\/.*\.ts$/.test(f))
	const issues: Array<CheckIssue> = []
	for (const file of files) {
		issues.push(...findBanners(file, await readRepoFile(file)))
	}
	reportAndExit(
		'decorative banners',
		issues,
		'Delete the banner. If a file needs section dividers, it wants to be split into modules.',
	)
}

if (isExecutedDirectly(import.meta.url)) await main()
