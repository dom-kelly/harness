import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { PolicyConfig } from '../policy/merge-policy.ts'
import { packageRoot } from './repo.ts'

export const configFile = 'harness.json'

/** `harness.json` in a product repo: what the harness needs to know about it. */
export type HarnessConfig = {
	/** The harness version these templates were last synced from. */
	harness: string
	product: { name: string }
	checks?: {
		/** Max lines for AGENTS.md (a map, not the docs). Default 20. */
		agentsMaxLines?: number
		/** Paths whose committed files are never edited, only added (migrations). */
		appendOnly?: Array<string>
		/** The one package manager; other lockfiles are refused. Default npm. */
		lockfile?: 'npm' | 'pnpm' | 'yarn' | 'bun'
		/** Path prefixes whose markdown links are not checked (mirrors of files
		 *  that live elsewhere, e.g. the harness repo's copies of its templates). */
		ignoreLinksIn?: Array<string>
	}
	guard?: {
		/** Extra Bash patterns the guard hook refuses (regex source + reason). */
		blocked?: Array<{ pattern: string; reason: string }>
	}
	/** Who may merge at each risk tier and which reviewers must have spoken. */
	policy?: PolicyConfig
}

export const packageVersion: string = JSON.parse(
	readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
).version

export function readConfig(root: string): HarnessConfig | undefined {
	const file = path.join(root, configFile)
	if (!existsSync(file)) return undefined
	return JSON.parse(readFileSync(file, 'utf8')) as HarnessConfig
}

export function writeConfig(root: string, config: HarnessConfig) {
	writeFileSync(
		path.join(root, configFile),
		`${JSON.stringify(config, null, '\t')}\n`,
	)
}
