import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { createApp } from './app.js'
import { ensureRelaxHome } from './config/home.js'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })
ensureRelaxHome()

const app = createApp()
const port = Number(process.env.PORT ?? 3001)

app.listen(port, () => {
	console.log(`server: http://localhost:${port}`)
})
