import { expect, test } from 'vitest'
import { isEnabled } from './flags.ts'

const experimenter = { optedIntoExperiments: true }
const regular = { optedIntoExperiments: false }

test('flags follow their declared audience unless overridden', () => {
	expect(isEnabled('example-flag', experimenter, {})).toBe(false)

	const experiments = { FLAG_EXAMPLE_FLAG: 'experiments' }
	expect(isEnabled('example-flag', experimenter, experiments)).toBe(true)
	expect(isEnabled('example-flag', regular, experiments)).toBe(false)

	const everyone = { FLAG_EXAMPLE_FLAG: 'everyone' }
	expect(isEnabled('example-flag', regular, everyone)).toBe(true)

	const invalid = { FLAG_EXAMPLE_FLAG: 'sometimes' }
	expect(isEnabled('example-flag', experimenter, invalid)).toBe(false)
})
