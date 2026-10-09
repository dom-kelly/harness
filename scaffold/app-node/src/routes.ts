import { execFileSync } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: IncomingMessage, res: ServerResponse) => void

function resolveSha() {
	if (process.env.GIT_SHA) return process.env.GIT_SHA
	try {
		return execFileSync('git', ['rev-parse', 'HEAD'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return 'unknown'
	}
}

const sha = resolveSha()

function json(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, { 'content-type': 'application/json' })
	res.end(JSON.stringify(body))
}

export const routes: Record<string, Handler> = {
	'GET /health': (_req, res) => json(res, 200, { ok: true, sha }),
	'GET /': (_req, res) => {
		res.writeHead(200, { 'content-type': 'text/html' })
		res.end(
			'<!doctype html><title>App</title><h1>Replace me with your product</h1>',
		)
	},
}

export function handle(req: IncomingMessage, res: ServerResponse) {
	const url = new URL(req.url ?? '/', 'http://localhost')
	const handler = routes[`${req.method} ${url.pathname}`]
	if (handler) return handler(req, res)
	json(res, 404, { ok: false, error: 'not found' })
}
