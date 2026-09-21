import { useEffect, useState } from 'react'
import { mockPty } from '../../contracts/adapters/mock'
import type { PluginRenderProps } from '../../types'
import { isTerminalPayload } from './open'

export function TerminalView({ tab }: PluginRenderProps) {
	const payload = isTerminalPayload(tab.payload) ? tab.payload : null
	const [output, setOutput] = useState('')

	useEffect(() => {
		if (!payload) return
		setOutput('')
		return mockPty.subscribe(payload.sessionId, (chunk) => {
			setOutput((prev) => prev + chunk)
		})
	}, [payload])

	if (!payload) {
		return <div className="p-3 text-sm text-fg-3">无效的终端会话</div>
	}

	return (
		<div className="flex h-full min-w-0 flex-col bg-app px-4 py-3">
			<div className="mb-3 text-sm text-fg-2">zsh</div>
			<pre className="flex-1 overflow-auto font-mono text-sm leading-6 text-fg">
				{output}
				<span className="inline-block h-4 w-1.5 translate-y-0.5 bg-fg" />
			</pre>
			<p className="mt-2 text-xs text-fg-3">占位终端。下一步接入 xterm.js + PtyApi。</p>
		</div>
	)
}
