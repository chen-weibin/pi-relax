import { useEffect, useState, type CSSProperties } from 'react'

export type ThemeType = 'light' | 'dark'

function readThemeType(): ThemeType {
	return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** 跟 `document.documentElement[data-theme]` 走。项目默认暗色，亮色是预留钩子。 */
export function useThemeType(): ThemeType {
	const [type, setType] = useState<ThemeType>(readThemeType)
	useEffect(() => {
		const observer = new MutationObserver(() => setType(readThemeType()))
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
		return () => observer.disconnect()
	}, [])
	return type
}

/**
 * 库自带的 CSS 变量接到项目 token。
 *
 * 自定义属性会继承进 Shadow DOM；设在宿主元素的 inline style 上，能盖住库 `:host` 里写死的值。
 * `--diffs-bg` / `--diffs-fg` 是底色和文字色，增删色由它们和 `--diffs-bg` 混出来，改一个就够。
 */
export const diffThemeVars = {
	'--diffs-bg': 'var(--app)',
	'--diffs-fg': 'var(--fg)',
	'--diffs-added-dark': 'var(--success)',
	'--diffs-added-light': 'var(--success)',
	'--diffs-deleted-dark': 'var(--error)',
	'--diffs-deleted-light': 'var(--error)',
	'--diffs-modified-dark': 'var(--info)',
	'--diffs-modified-light': 'var(--info)',
	'--diffs-font-family': 'var(--font-mono)',
	'--diffs-header-font-family': 'var(--font-sans)',
} as CSSProperties
