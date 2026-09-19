import express from 'express'

const app = express()

app.get('/', (_req, res) => {
	res.json({ status: 'ok' })
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
	console.log(`server: http://localhost:${port}`)
})
