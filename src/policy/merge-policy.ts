import { execFileSync } from 'node:child_process'
import {
	loadMap,
	riskLevels,
	summarizeChanges,
	type Risk,
} from '../checks/primitives.ts'
import type { HarnessConfig } from '../lib/config.ts'

/** `harness.json` → `policy`. Mirrors kody's ship-pr tiers:
 *    low    green CI
 *    medium + every gate reviewer's check passed and its findings addressed
 *    high   + every required reviewer has reviewed
 *  `authority` says who merges at each tier; "owner" parks the PR. */
export type PolicyConfig = {
	/** The npm script that is the local gate; also the default CI check name. */
	gate?: string
	/** The CI check that must be SUCCESS. Default: the gate name. */
	ciCheck?: string
	authority?: Partial<Record<Risk, 'agent' | 'owner'>>
	reviewers?: {
		/** Medium and high: the check must pass, and threads this login opened must be addressed. */
		gate?: Array<{ check: string; login: string }>
		/** High: these logins must have posted a review. */
		required?: Array<string>
		/** Logins whose unresolved threads must be answered. Default: gate logins + required. */
		findingsFrom?: Array<string>
		/** Checks whose status never blocks (a reviewer that stays "pending" after reviewing). */
		ignoreChecks?: Array<string>
	}
	/** Route `gh pr merge` through the policy in the guard hook. Default true. */
	enforceOnMerge?: boolean
}

export type Verdict = {
	allowed: boolean
	risk?: Risk
	/** The reason it is not allowed, or how it was allowed. */
	message: string
	/** Progress lines, for the hook's stderr. */
	lines: Array<string>
}

const addressed = /^\s*(Fixed in [0-9a-f]{7,}|wontfix:)/i

function rank(risk: Risk) {
	return riskLevels.indexOf(risk)
}

function max(a: Risk, b: Risk): Risk {
	return rank(a) >= rank(b) ? a : b
}

export function gh(args: Array<string>, cwd: string) {
	return execFileSync('gh', args, {
		cwd,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim()
}

/** Exactly one `**Name:** \`value\`` line, with an allowed value: never a
 *  substring, never a second contradicting line. */
export function bodyField(
	body: string,
	name: string,
	allowed: ReadonlyArray<string>,
) {
	const lines = body
		.split('\n')
		.filter((line) => line.startsWith(`**${name}:**`))
	if (lines.length !== 1) return undefined
	const match = new RegExp(
		`^\\*\\*${name}:\\*\\*\\s+\`(${allowed.join('|')})\`\\s*$`,
	).exec(lines[0]!)
	return match?.[1]
}

type PullRequest = {
	isDraft: boolean
	baseRefName: string
	body: string
	statusCheckRollup: Array<{
		name?: string
		context?: string
		conclusion?: string | null
		state?: string
	}>
}

type PullFile = { status: string; filename: string; previous_filename?: string }

type Threads = {
	data: {
		repository: {
			pullRequest: {
				reviewThreads: {
					nodes: Array<{
						isResolved: boolean
						comments: {
							nodes: Array<{ author: { login: string }; body?: string }>
						}
					}>
				}
				reviews: { nodes: Array<{ author: { login: string } }> }
			}
		}
	}
}

export function evaluateMerge(
	root: string,
	config: HarnessConfig | undefined,
	prArg?: string,
): Verdict {
	const policy = config?.policy ?? {}
	const gate = policy.gate ?? 'validate'
	const ciCheck = policy.ciCheck ?? gate
	const authority = {
		low: 'agent',
		medium: 'agent',
		high: 'owner',
		...policy.authority,
	}
	const reviewers = policy.reviewers ?? {}
	const gateReviewers = reviewers.gate ?? []
	const required = reviewers.required ?? []
	const findingsFrom = reviewers.findingsFrom ?? [
		...gateReviewers.map((g) => g.login),
		...required,
	]
	const ignoreChecks = new Set(reviewers.ignoreChecks ?? [])
	const lines: Array<string> = []
	const no = (message: string): Verdict => ({
		allowed: false,
		message: `Merge refused: ${message}. See docs/contributing/shipping-policy.md.`,
		lines,
	})

	let pr = prArg
	try {
		pr ||= gh(['pr', 'view', '--json', 'number', '--jq', '.number'], root)
	} catch {
		return no("couldn't find the PR")
	}
	let repo: string
	let info: PullRequest
	let files: Array<PullFile>
	try {
		repo = gh(
			['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
			root,
		)
		info = JSON.parse(
			gh(
				[
					'pr',
					'view',
					pr,
					'--json',
					'isDraft,baseRefName,body,statusCheckRollup',
				],
				root,
			),
		)
		files = gh(
			[
				'api',
				'--paginate',
				`repos/${repo}/pulls/${pr}/files`,
				'--jq',
				'.[] | {status, filename, previous_filename}',
			],
			root,
		)
			.split('\n')
			.filter(Boolean)
			.map((line) => JSON.parse(line) as PullFile)
	} catch (error) {
		return no(
			`couldn't read PR #${pr} (${error instanceof Error ? error.message.split('\n')[0] : String(error)})`,
		)
	}
	if (info.isDraft) return no(`PR #${pr} is a draft`)
	if (info.baseRefName !== 'main') return no(`PR #${pr} doesn't target main`)

	// Tests may be added or changed, never removed.
	const removedTests = files.filter(
		(f) => f.status === 'removed' && /\.(test|spec)\.ts$/.test(f.filename),
	)
	if (removedTests.length) {
		return no(
			`it deletes tests: ${removedTests.map((f) => f.filename).join(', ')}`,
		)
	}

	// Risk = the highest of the declared Change, the primitives' floors and the Door.
	const change = bodyField(info.body, 'Change', ['composes', 'extends', 'adds'])
	if (!change)
		return no(
			'the PR needs exactly one Change line, set to one of `composes` / `extends` / `adds`',
		)
	const declared: Risk =
		change === 'composes' ? 'low' : change === 'extends' ? 'medium' : 'high'
	const door = bodyField(info.body, 'Door', ['two-way', 'one-way'])
	if (!door)
		return no(
			'the PR needs exactly one Door line, set to one of `two-way` / `one-way`',
		)
	const doorRisk: Risk = door === 'two-way' ? 'low' : 'high'
	// A rename also carries its old path, so moving a high-risk file somewhere
	// low-risk is still judged by where it came from.
	const paths = files.flatMap((f) =>
		f.previous_filename ? [f.filename, f.previous_filename] : [f.filename],
	)
	const summary = summarizeChanges(loadMap(root), paths)
	const risk = max(max(declared, summary.floor), doorRisk)
	lines.push(
		`policy: PR #${pr} declared=${change} floor=${summary.floor} (${summary.primitives.map((p) => p.id).join(',')}) door=${doorRisk}`,
		`policy: PR #${pr} risk=${risk}`,
	)

	// Every tier: green CI.
	const checks = info.statusCheckRollup.map((c) => ({
		name: c.name ?? c.context ?? '',
		state: c.conclusion ?? c.state ?? '',
	}))
	if (!checks.some((c) => c.name === ciCheck && c.state === 'SUCCESS')) {
		return no(`the ${ciCheck} check hasn't passed`)
	}
	const red = checks.filter(
		(c) =>
			!ignoreChecks.has(c.name) &&
			!['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(c.state),
	)
	if (red.length)
		return no(
			`checks not green: ${red.map((c) => `${c.name}=${c.state}`).join(' ')}`,
		)

	const park = (why: string): Verdict => ({
		allowed: false,
		risk,
		message: `Merge needs the user (${risk} risk, ${why}): hand PR #${pr} to the user.`,
		lines,
	})
	const yes = (why: string): Verdict => ({
		allowed: true,
		risk,
		message: `policy: ${risk} risk, ${why} — agent may merge.`,
		lines,
	})
	if (risk === 'low') {
		return authority.low === 'agent' ? yes('CI green') : park('CI green')
	}

	// Medium and high: gate reviewers passed, their findings addressed.
	for (const { check } of gateReviewers) {
		if (!checks.some((c) => c.name === check && c.state === 'SUCCESS')) {
			return no(`waiting for ${check} to pass (risk=${risk})`)
		}
	}
	let threads: Threads
	try {
		const [owner, name] = repo.split('/')
		threads = JSON.parse(
			gh(
				[
					'api',
					'graphql',
					'-f',
					`owner=${owner}`,
					'-f',
					`name=${name}`,
					'-F',
					`pr=${pr}`,
					'-f',
					'query=query($owner:String!,$name:String!,$pr:Int!){repository(owner:$owner,name:$name){pullRequest(number:$pr){reviewThreads(first:100){nodes{isResolved comments(first:50){nodes{author{login} body}}}} reviews(first:100){nodes{author{login}}}}}}',
				],
				root,
			),
		)
	} catch {
		return no("couldn't read review threads")
	}
	const pull = threads.data.repository.pullRequest
	const open = pull.reviewThreads.nodes.filter((t) => {
		if (t.isResolved) return false
		const [first, ...replies] = t.comments.nodes
		if (!first || !findingsFrom.includes(first.author.login)) return false
		return !replies.some((r) => addressed.test(r.body ?? ''))
	})
	if (open.length) {
		const from = [
			...new Set(open.map((t) => t.comments.nodes[0]!.author.login)),
		].join(' ')
		return no(
			`${open.length} review finding(s) from ${from} not addressed — fix and reply 'Fixed in <sha>: …', or reply 'wontfix: <reason>'`,
		)
	}
	if (risk === 'medium') {
		const why = gateReviewers.length
			? 'CI and reviewers green, findings addressed'
			: 'CI green'
		return authority.medium === 'agent' ? yes(why) : park(why)
	}

	// High: every required reviewer has reviewed.
	const reviewed = new Set(pull.reviews.nodes.map((r) => r.author.login))
	for (const login of required) {
		if (!reviewed.has(login))
			return no(`waiting for a review from ${login} (risk=high)`)
	}
	const why = required.length ? 'all reviewers done' : 'CI green'
	return authority.high === 'agent' ? yes(why) : park(why)
}

/** PR number from a `gh pr merge …` command, if one is given. */
export function prNumberFromCommand(command: string) {
	const tail = /\bmerge\b([^;&|]*)/.exec(command)?.[1] ?? ''
	return /(?:^|\s)#?(\d+)(?=\s|$)/.exec(tail)?.[1]
}
