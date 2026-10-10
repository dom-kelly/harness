import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['src/e2e/**', 'node_modules/**'],
		clearMocks: true,
		mockReset: true,
		testTimeout: 20_000,
	},
})
