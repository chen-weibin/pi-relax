import { SiteMark } from '../ui/SiteMark'
import { Preview } from './frame'

function SiteMarkDemo() {
	return (
		<div className="grid w-full grid-cols-2 gap-4">
			<Preview label="加载图片">
				<div className="flex items-center gap-3">
					<SiteMark name="Pi" src="https://pi.dev/favicon.ico" />
					<SiteMark name="GitHub" src="https://github.com/favicon.ico" />
					<SiteMark src="https://github.com/favicon.ico" />
				</div>
			</Preview>
			<Preview label="没有地址 / 加载失败">
				<div className="flex items-center gap-3">
					<SiteMark name="motion" src={null} />
					<SiteMark name="web" src="https://no-such-host.example/favicon.ico" />
					<SiteMark src={null} />
				</div>
			</Preview>
			<Preview label="sm / md / lg">
				<div className="flex items-end gap-3">
					<SiteMark name="S" size="sm" src={null} />
					<SiteMark name="M" size="md" src={null} />
					<SiteMark name="L" size="lg" src={null} />
				</div>
			</Preview>
			<Preview label="自定义大小和颜色">
				<div className="flex items-center gap-3">
					<SiteMark name="32" size={32} color="#111111" src={null} />
					<SiteMark name="Pi" size="lg" color="#e11d48" src={null} />
				</div>
			</Preview>
			<Preview label="可点击">
				<SiteMark
					name="GitHub"
					size="lg"
					src="https://github.com/favicon.ico"
					clickable
					aria-label="GitHub"
					onClick={() => {
						console.log('github')
					}}
				/>
			</Preview>
			<Preview label="className 与 style">
				<div className="flex items-center gap-3">
					<SiteMark name="环" src={null} className="ring-2 ring-fg-3" />
					<SiteMark name="方" src={null} color="#0f766e" style={{ borderRadius: 4 }} />
				</div>
			</Preview>
		</div>
	)
}

export const siteMarkDoc = {
	id: 'site-mark',
	heading: 'SiteMark',
	description: '圆标。传入图片地址并负责加载；失败或没有地址时用首字。大小、颜色、点击和 className / style 都可改。',
	nav: ['SiteMark'],
	Demo: SiteMarkDemo,
}
