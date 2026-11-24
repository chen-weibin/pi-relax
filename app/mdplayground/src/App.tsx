import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MdEditor, type MdEditorTheme } from '@relax/md-editor'
import './shell.css'

const sidebarWidth = 240

export function App() {
	const shellRef = useRef<HTMLDivElement>(null)
	const [theme, setTheme] = useState<MdEditorTheme>('light')
	const [open, setOpen] = useState(true)
	const reduceMotion = useReducedMotion()
	const [duration, setDuration] = useState(0)

	useLayoutEffect(() => {
		const shell = shellRef.current
		if (!shell) return
		const raw = getComputedStyle(shell).getPropertyValue('--pg-duration').trim()
		const ms = Number.parseFloat(raw)
		setDuration(reduceMotion || !Number.isFinite(ms) ? 0 : ms / 1000)
	}, [theme, reduceMotion])

	return (
		<div className="shell" data-theme={theme} ref={shellRef}>
			<motion.aside
				className="sidebar"
				initial={false}
				animate={{ width: open ? sidebarWidth : 0 }}
				transition={{ duration }}
			/>
			<div className="main">
				<header className="header">
					<button type="button" onClick={() => setOpen((value) => !value)}>
						{open ? '收起' : '展开'}
					</button>
					<button type="button" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
						{theme === 'light' ? '亮色' : '暗色'}
					</button>
				</header>
				<div className="editor-pane">
					<MdEditor theme={theme} />
				</div>
			</div>
		</div>
	)
}
