import { ThemeSelector } from '../../ui/ThemeSelector'
import { settingAnchorProps } from './SettingAnchor'
import { type SettingPanelProps } from './settingSearch'
import { useSettingScroll } from './useSettingScroll'

const THEME_LABEL = '主题'
const THEME_DESCRIPTION = '在浅色、深色主题之间选择（当前仅支持暗色界面）'

export function Appearance({ focus }: SettingPanelProps) {
	useSettingScroll('appearance', focus, true)

	return (
		<section className="flex flex-col gap-8" {...settingAnchorProps('theme')}>
			<div>
				<div className="text-md text-fg">{THEME_LABEL}</div>
				{/* 括号内临时提示：亮色实装后去掉 */}
				<div className="text-sm text-fg-3">{THEME_DESCRIPTION}</div>
			</div>
			<div className="flex justify-center">
				<ThemeSelector value="dark" />
			</div>
		</section>
	)
}
