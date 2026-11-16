import { ThemeSelector } from '../../ui/ThemeSelector'

export function Appearance() {
	return (
		<section className="flex flex-col gap-8">
			<div>
				<div className="text-md text-fg">主题</div>
				{/* 括号内临时提示：亮色实装后去掉 */}
				<div className="text-sm text-fg-3">
					在浅色、深色主题之间选择（当前仅支持暗色界面）
				</div>
			</div>
			<div className="flex justify-center">
				<ThemeSelector value="dark" />
			</div>
		</section>
	)
}
