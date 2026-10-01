import { createServer } from 'node:http'
import { handle } from './routes.ts'

const port = Number(process.env.PORT ?? 3000)

createServer(handle).listen(port, () => {
	console.log(`App running at http://localhost:${port}`)
})
