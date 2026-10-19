import { loader } from '@monaco-editor/react'
import { shikiToMonaco, textmateThemeToMonacoTheme } from '@shikijs/monaco'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'
import { createHighlighter } from 'shiki'
import { MONACO_THEME, monacoThemes } from './themes'

window.MonacoEnvironment = {
	getWorker(_workerId: string, label: string) {
		if (label === 'json') return new jsonWorker()
		if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
		if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
		if (label === 'typescript' || label === 'javascript') return new tsWorker()
		return new editorWorker()
	},
}

loader.config({ monaco })

export { MONACO_THEME }

function cssColor(name: string, fallback: string) {
	if (typeof document === 'undefined') return fallback
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
	return value || fallback
}

let themeReady: Promise<void> | undefined

export function ensureMonacoTheme() {
	themeReady ??= loadMonacoTheme().catch((error) => {
		themeReady = undefined
		throw error
	})
	return themeReady
}

async function loadMonacoTheme() {
	const highlighter = await createHighlighter({
		themes: [...monacoThemes],
		langs: ['javascript', 'typescript', 'css', 'html', 'markdown'],
	})
	shikiToMonaco(highlighter, monaco)
	const theme = textmateThemeToMonacoTheme(
		highlighter.getTheme(MONACO_THEME),
	) as monaco.editor.IStandaloneThemeData
	const colors = theme.colors
	const background = cssColor('--app', '#151515')
	const lineNumber =
		colors['editorLineNumber.activeForeground'] ??
		colors['editorLineNumber.foreground'] ??
		cssColor('--fg-3', '#a1a1a1')
	monaco.editor.defineTheme(MONACO_THEME, {
		...theme,
		colors: {
			...colors,
			'editor.background': background,
			'editorGutter.background': background,
			'minimap.background': background,
			'editorLineNumber.foreground': lineNumber,
			'editorLineNumber.activeForeground': lineNumber,
		},
	})
	monaco.editor.setTheme(MONACO_THEME)
}
