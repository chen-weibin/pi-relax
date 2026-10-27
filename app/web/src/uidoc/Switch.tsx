import { useState } from 'react'
import { Switch } from '../ui/Switch'
import { Preview } from './frame'

function SwitchDemo() {
	const [on, setOn] = useState(true)
	const [off, setOff] = useState(false)
	return (
		<div className="grid grid-cols-3 gap-4">
			<Preview label="开">
				<Switch checked={on} onChange={setOn} ariaLabel="开" />
			</Preview>
			<Preview label="关">
				<Switch checked={off} onChange={setOff} ariaLabel="关" />
			</Preview>
			<Preview label="disabled">
				<Switch defaultChecked disabled ariaLabel="禁用" />
			</Preview>
		</div>
	)
}

export const switchDoc = {
	id: 'switch',
	heading: 'Switch',
	description: '开 / 关开关。前两个可以点，第三个是禁用。',
	nav: ['Switch'],
	Demo: SwitchDemo,
}
