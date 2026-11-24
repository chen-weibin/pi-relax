import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MdEditor, type MdEditorMode, type MdEditorTheme } from '@relax/md-editor'
import { Button } from './ui/Button'
import './shell.css'

const sidebarWidth = 240
const sidebarOpenKey = 'mdplayground.sidebar-open'

function readSidebarOpen() {
	try {
		return localStorage.getItem(sidebarOpenKey) !== '0'
	} catch {
		return true
	}
}

function writeSidebarOpen(open: boolean) {
	try {
		localStorage.setItem(sidebarOpenKey, open ? '1' : '0')
	} catch {
		// 无痕或配额满时这次切换仍生效，只是刷新后回到缺省展开。
	}
}

export function App() {
	const shellRef = useRef<HTMLDivElement>(null)
	const [theme, setTheme] = useState<MdEditorTheme>('light')
	const [mode, setMode] = useState<MdEditorMode>('edit')
	const [open, setOpen] = useState(readSidebarOpen)
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
		<div
			className="flex h-full bg-app text-fg [font-family:var(--pg-font-family)]"
			data-theme={theme}
			ref={shellRef}
		>
			<motion.aside
				className="z-[var(--pg-z-fixed)] h-full shrink-0 overflow-hidden bg-sidebar"
				initial={false}
				animate={{ width: open ? sidebarWidth : 0 }}
				transition={{ duration }}
			>
				<div className="w-60 p-3">
					<Button block size="sm" onClick={() => setMode((value) => (value === 'edit' ? 'read' : 'edit'))}>
						{mode === 'edit' ? '编辑' : '阅读'}
					</Button>
				</div>
			</motion.aside>
			<div className="flex h-full min-w-0 flex-1 flex-col">
				<header className="flex h-10 shrink-0 items-center justify-between px-3">
					<Button
						size="sm"
						onClick={() =>
							setOpen((value) => {
								const next = !value
								writeSidebarOpen(next)
								return next
							})
						}
					>
						{open ? '收起' : '展开'}
					</Button>
					<Button size="sm" onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
						{theme === 'light' ? '亮色' : '暗色'}
					</Button>
				</header>
				<div className="min-h-0 flex-1 overflow-auto bg-app">
					<div className="mx-auto min-h-full w-[min(760px,calc(100%-64px))] max-[700px]:w-[min(720px,calc(100%-32px))]">
						<MdEditor theme={theme} mode={mode} />
					</div>
				</div>
			</div>
		</div>
	)
}
