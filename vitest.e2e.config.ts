import { defineConfig } from 'vitest/config'

// The pack-and-install lane: builds the package, scaffolds a product, installs
// the tarball into it and runs the product's own gate. Needs the network.
export default defineConfig({
	test: {
		include: ['src/e2e/**/*.test.ts'],
		testTimeout: 300_000,
		hookTimeout: 300_000,
	},
})
