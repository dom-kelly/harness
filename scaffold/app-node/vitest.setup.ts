import { afterEach, beforeEach, vi } from 'vitest'

const allowedConsole = new Set<string>()

export function allowConsole(method: 'error' | 'warn') {
	allowedConsole.add(method)
}

beforeEach(() => {
	allowedConsole.clear()
	for (const method of ['error', 'warn'] as const) {
		vi.spyOn(console, method).mockImplementation((...args: Array<unknown>) => {
			if (allowedConsole.has(method)) return
			throw new Error(
				`Unexpected console.${method} in test: ${args.map(String).join(' ')}. ` +
					'Fix the cause, or call allowConsole() and assert on the output.',
			)
		})
	}
})

afterEach(() => {
	vi.restoreAllMocks()
})
