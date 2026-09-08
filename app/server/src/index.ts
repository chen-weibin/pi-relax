import { createAgent } from 'relax-agent'

// import express from 'express'
// import { add } from 'relax-agent'

// const app = express()

// app.get('/', (_req, res) => {
// 	res.json({ sum: add(1, 2) })
// })

// const port = Number(process.env.PORT ?? 3001)
// app.listen(port, () => {
// 	console.log(`server: http://localhost:${port}`)
// })

async function main() {
	const { session } = await createAgent({
		model: 'MiniMax-M3',
		apiKey: process.env.MINIMAX_API_KEY!,
	})

	session.subscribe((event) => {
		if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
			process.stdout.write(event.assistantMessageEvent.delta)
		}
	})

	await session.prompt('你好,你是什么模型')
	process.stdout.write('\n')
	session.dispose()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
