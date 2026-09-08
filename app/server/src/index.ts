import express from 'express'
import { add } from 'relax-agent'

const app = express()

app.get('/', (_req, res) => {
	res.json({ sum: add(1, 2) })
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
	console.log(`server: http://localhost:${port}`)
})
