import { useState } from 'react'
import {
	ThemeSelector,
	DEFAULT_THEMES,
	type ThemeOption,
} from '../ui/ThemeSelector'
import { Preview } from './frame'

const ENABLED_THEMES: ThemeOption[] = DEFAULT_THEMES.map((theme) => ({
	...theme,
	disabled: false,
	disabledHint: undefined,
}))

function ThemeSelectorDemo() {
	const [theme, setTheme] = useState('dark')
	return (
		<div className="flex flex-col gap-6">
			<Preview label="默认（亮色禁用）" bodyClassName="items-stretch">
				<ThemeSelector value="dark" />
			</Preview>
			<Preview label="受控切换（演示用，两项都可点）" bodyClassName="items-stretch">
				<ThemeSelector
					value={theme}
					onChange={setTheme}
					themes={ENABLED_THEMES}
				/>
			</Preview>
		</div>
	)
}

export const themeSelectorDoc = {
	id: 'theme-selector',
	heading: 'ThemeSelector',
	description:
		'一排迷你应用预览卡片选主题。默认暗色可选、亮色禁用并提示当前暂未实现。',
	nav: ['ThemeSelector'],
	Demo: ThemeSelectorDemo,
}
