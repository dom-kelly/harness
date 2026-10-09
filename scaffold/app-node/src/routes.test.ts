import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from 'vitest'
import { handle } from './routes.ts'

async function startServer() {
	const server = createServer(handle)
	await new Promise<void>((resolve) => server.listen(0, resolve))
	const { port } = server.address() as AddressInfo
	return {
		origin: `http://localhost:${port}`,
		close: () => new Promise((resolve) => server.close(resolve)),
	}
}

test('health reports ok and a sha; unknown routes 404', async () => {
	const server = await startServer()
	try {
		const health = await fetch(`${server.origin}/health`)
		expect(health.status).toBe(200)
		expect(await health.json()).toMatchObject({
			ok: true,
			sha: expect.any(String),
		})

		const missing = await fetch(`${server.origin}/nope`)
		expect(missing.status).toBe(404)
	} finally {
		await server.close()
	}
})
