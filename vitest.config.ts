import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
		setupFiles: ['./vitest.setup.ts'],
		clearMocks: true,
		mockReset: true,
		testTimeout: 20_000,
	},
})
