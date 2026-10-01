type FlagAudience = 'off' | 'experiments' | 'everyone'

type FlagDefinition = {
	description: string
	audience: FlagAudience
	successMetric: string
	removeWhen: string
}

export const flags = {
	'example-flag': {
		description:
			'Demonstrates the flag shape. Delete when the first real flag lands.',
		audience: 'off',
		successMetric: 'None; this flag gates nothing.',
		removeWhen: 'A real flag exists in this file.',
	},
} satisfies Record<string, FlagDefinition>

type FlagName = keyof typeof flags

type FlagSubject = { optedIntoExperiments: boolean }

type Env = Record<string, string | undefined>

export function flagEnvKey(name: string) {
	return `FLAG_${name.toUpperCase().replaceAll('-', '_')}`
}

function audienceOverride(name: FlagName, env: Env): FlagAudience | undefined {
	const value = env[flagEnvKey(name)]
	if (value === 'off' || value === 'experiments' || value === 'everyone') {
		return value
	}
	return undefined
}

export function isEnabled(
	name: FlagName,
	subject: FlagSubject,
	env: Env = process.env,
) {
	const audience = audienceOverride(name, env) ?? flags[name].audience
	if (audience === 'everyone') return true
	if (audience === 'experiments') return subject.optedIntoExperiments
	return false
}
