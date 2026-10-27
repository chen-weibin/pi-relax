import { SettingGroup } from '../ui/SettingGroup'
import { SettingRow } from '../ui/SettingRow'
import { Switch } from '../ui/Switch'
import { Preview } from './frame'

function SettingDemo() {
	return (
		<Preview label="分组 + 行" bodyClassName="items-stretch bg-app">
			<div className="w-full max-w-md">
				<SettingGroup title="外观">
					<SettingRow label="深色" description="界面使用深色">
						<Switch defaultChecked ariaLabel="深色" />
					</SettingRow>
					<SettingRow label="紧凑" description="缩小行距">
						<Switch ariaLabel="紧凑" />
					</SettingRow>
				</SettingGroup>
			</div>
		</Preview>
	)
}

export const settingDoc = {
	id: 'setting',
	heading: 'SettingGroup、SettingRow',
	description: '设置分组卡片，行的右侧放开关。两条之间有分隔线。',
	nav: ['SettingGroup', 'SettingRow'],
	Demo: SettingDemo,
}
