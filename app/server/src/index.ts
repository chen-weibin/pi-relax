import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createApp } from './app.js'
import { ensureRelaxHome } from './config/home.js'
import { attachFs } from './fs/watch.js'
import { attachPty } from './pty/attach.js'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })
ensureRelaxHome()

const app = createApp()
const port = Number(process.env.PORT ?? 3001)

const server = app.listen(port, () => {
	console.log(`server: http://localhost:${port}`)
})
attachFs(server)
attachPty(server)
