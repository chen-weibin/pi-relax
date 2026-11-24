export const themeTokenVars = {
	bg: '--md-editor-bg',
	surface: '--md-editor-surface',
	surface2: '--md-editor-surface-2',
	border: '--md-editor-border',
	borderStrong: '--md-editor-border-strong',
	text: '--md-editor-text',
	text2: '--md-editor-text-2',
	text3: '--md-editor-text-3',
	muted: '--md-editor-muted',
	disabled: '--md-editor-disabled',
	inverseBg: '--md-editor-inverse-bg',
	inverseText: '--md-editor-inverse-text',
	brand: '--md-editor-brand',
	brandSoft: '--md-editor-brand-soft',
	info: '--md-editor-info',
	infoSoft: '--md-editor-info-soft',
	success: '--md-editor-success',
	successSoft: '--md-editor-success-soft',
	warning: '--md-editor-warning',
	warningSoft: '--md-editor-warning-soft',
	error: '--md-editor-error',
	errorSoft: '--md-editor-error-soft',
	neutral0: '--md-editor-neutral-0',
	neutral50: '--md-editor-neutral-50',
	neutral100: '--md-editor-neutral-100',
	neutral200: '--md-editor-neutral-200',
	neutral300: '--md-editor-neutral-300',
	neutral400: '--md-editor-neutral-400',
	neutral500: '--md-editor-neutral-500',
	neutral600: '--md-editor-neutral-600',
	neutral700: '--md-editor-neutral-700',
	neutral800: '--md-editor-neutral-800',
	neutral900: '--md-editor-neutral-900',
	neutral950: '--md-editor-neutral-950',
	brand50: '--md-editor-brand-50',
	brand100: '--md-editor-brand-100',
	brand200: '--md-editor-brand-200',
	brand300: '--md-editor-brand-300',
	brand400: '--md-editor-brand-400',
	brand500: '--md-editor-brand-500',
	brand600: '--md-editor-brand-600',
	brand700: '--md-editor-brand-700',
	brand800: '--md-editor-brand-800',
	brand900: '--md-editor-brand-900',
	brand950: '--md-editor-brand-950',
	radiusXs: '--md-editor-radius-xs',
	radiusSm: '--md-editor-radius-sm',
	radiusMd: '--md-editor-radius-md',
	radiusLg: '--md-editor-radius-lg',
	radiusXl: '--md-editor-radius-xl',
	radiusFull: '--md-editor-radius-full',
	space4: '--md-editor-space-4',
	space8: '--md-editor-space-8',
	space12: '--md-editor-space-12',
	space16: '--md-editor-space-16',
	space24: '--md-editor-space-24',
	space32: '--md-editor-space-32',
	fontXs: '--md-editor-font-xs',
	fontSm: '--md-editor-font-sm',
	fontBase: '--md-editor-font-base',
	fontLg: '--md-editor-font-lg',
	fontXl: '--md-editor-font-xl',
	font2xl: '--md-editor-font-2xl',
	font3xl: '--md-editor-font-3xl',
	font4xl: '--md-editor-font-4xl',
	shadowSm: '--md-editor-shadow-sm',
	shadowMd: '--md-editor-shadow-md',
	shadowLg: '--md-editor-shadow-lg',
	shadowXl: '--md-editor-shadow-xl',
	zDropdown: '--md-editor-z-dropdown',
	zSticky: '--md-editor-z-sticky',
	zFixed: '--md-editor-z-fixed',
	zOverlay: '--md-editor-z-overlay',
	zModal: '--md-editor-z-modal',
	zPopover: '--md-editor-z-popover',
	zTooltip: '--md-editor-z-tooltip',
	zToast: '--md-editor-z-toast',
	durationFast: '--md-editor-duration-fast',
	duration: '--md-editor-duration',
	durationSlow: '--md-editor-duration-slow',
	fontFamily: '--md-editor-font-family',
	fontSize: '--md-editor-font-size',
	lineHeight: '--md-editor-line-height',
	paragraphGap: '--md-editor-paragraph-gap',
	placeholder: '--md-editor-placeholder-color',
	caret: '--md-editor-caret',
	selection: '--md-editor-selection',
	rule: '--md-editor-rule',
} as const

export type MdEditorTheme = 'light' | 'dark'

export type MdEditorThemeTokens = {
	[K in keyof typeof themeTokenVars]: string
}

export type MdEditorThemes = {
	light?: Partial<MdEditorThemeTokens>
	dark?: Partial<MdEditorThemeTokens>
}

export function themeStyleVars(tokens?: Partial<MdEditorThemeTokens>): Record<string, string> {
	const style: Record<string, string> = {}
	if (!tokens) return style
	for (const key of Object.keys(themeTokenVars) as (keyof MdEditorThemeTokens)[]) {
		const value = tokens[key]
		if (value !== undefined) style[themeTokenVars[key]] = value
	}
	return style
}
