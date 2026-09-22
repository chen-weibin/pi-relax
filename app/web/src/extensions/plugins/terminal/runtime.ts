import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { mockPty } from '../../contracts/adapters/mock'
import './xterm.css'

function cssVar(name: string, fallback: string) {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
	return value || fallback
}

function readTheme() {
	const fg = cssVar('--fg', '#e5e5e5')
	const bg = cssVar('--app', '#171717')
	const muted = cssVar('--fg-3', '#a1a1a1')
	return {
		foreground: fg,
		background: bg,
		cursor: fg,
		cursorAccent: bg,
		selectionBackground: cssVar('--surface-active', '#2e2e2e'),
		selectionForeground: fg,
		black: '#1a1a1a',
		red: cssVar('--error', '#f05252'),
		green: cssVar('--success', '#00c487'),
		yellow: cssVar('--warning', '#d9a441'),
		blue: cssVar('--info', '#5b9cf6'),
		magenta: muted,
		cyan: cssVar('--accent', '#00c487'),
		white: fg,
		brightBlack: muted,
		brightRed: cssVar('--error', '#f05252'),
		brightGreen: cssVar('--success', '#00c487'),
		brightYellow: cssVar('--warning', '#d9a441'),
		brightBlue: cssVar('--info', '#5b9cf6'),
		brightMagenta: cssVar('--fg-2', '#c7c7c7'),
		brightCyan: cssVar('--accent', '#00c487'),
		brightWhite: cssVar('--fg-bright', '#f5f5f5'),
	}
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export type TerminalRuntime = {
	sessionId: string
	term: Terminal
	element: HTMLDivElement
	fit: () => void
	focus: () => void
	dispose: () => void
}

const runtimes = new Map<string, TerminalRuntime>()

let park: HTMLDivElement | null = null

function getPark() {
	if (park) return park
	park = document.createElement('div')
	park.setAttribute('data-terminal-park', '')
	park.setAttribute('aria-hidden', 'true')
	park.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;overflow:hidden'
	document.body.appendChild(park)
	return park
}

function createRuntime(sessionId: string): TerminalRuntime {
	const element = document.createElement('div')
	element.className = 'terminal-xterm h-full min-h-0 w-full'
	element.dataset.sessionId = sessionId

	const term = new Terminal({
		cursorBlink: !prefersReducedMotion(),
		cursorStyle: 'bar',
		fontSize: 13,
		fontFamily: cssVar(
			'--font-mono',
			'ui-monospace, "SF Mono", Monaco, Consolas, "Courier New", monospace',
		),
		theme: readTheme(),
		scrollback: 2000,
	})
	const fitAddon = new FitAddon()
	term.loadAddon(fitAddon)
	term.open(element)

	const dataSub = term.onData((data) => {
		void mockPty.write(sessionId, data)
	})
	const ptyUnsub = mockPty.subscribe(sessionId, (chunk) => {
		term.write(chunk)
	})

	const themeObs = new MutationObserver(() => {
		term.options.theme = readTheme()
	})
	themeObs.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme'],
	})

	const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
	const onMotion = () => {
		term.options.cursorBlink = !motion.matches
	}
	motion.addEventListener('change', onMotion)

	const fit = () => {
		const parent = element.parentElement
		if (!parent || parent.clientWidth < 16 || parent.clientHeight < 16) return
		const dim = fitAddon.proposeDimensions()
		if (!dim) return
		fitAddon.fit()
		void mockPty.resize(sessionId, term.cols, term.rows)
	}

	return {
		sessionId,
		term,
		element,
		fit,
		focus: () => term.focus(),
		dispose: () => {
			dataSub.dispose()
			ptyUnsub()
			themeObs.disconnect()
			motion.removeEventListener('change', onMotion)
			term.dispose()
			element.remove()
		},
	}
}

export function acquireTerminalRuntime(sessionId: string) {
	let runtime = runtimes.get(sessionId)
	if (!runtime) {
		runtime = createRuntime(sessionId)
		runtimes.set(sessionId, runtime)
	}
	return runtime
}

export function releaseTerminalRuntime(sessionId: string) {
	const runtime = runtimes.get(sessionId)
	if (!runtime) return
	runtimes.delete(sessionId)
	runtime.dispose()
}

export function parkTerminalRuntime(runtime: TerminalRuntime) {
	if (!runtimes.has(runtime.sessionId)) return
	getPark().appendChild(runtime.element)
}
