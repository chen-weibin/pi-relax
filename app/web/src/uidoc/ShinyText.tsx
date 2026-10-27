import { ShinyText } from '../ui/ShinyText'
import { Preview } from './frame'

function ShinyTextDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			<Preview label="静止">
				<ShinyText text="静止标题" disabled />
			</Preview>
			<Preview label="扫光">
				<ShinyText text="扫光标题" />
			</Preview>
		</div>
	)
}

export const shinyTextDoc = {
	id: 'shiny-text',
	heading: 'ShinyText',
	description: '标题扫光。左边停住，右边在走光。',
	nav: ['ShinyText'],
	Demo: ShinyTextDemo,
}
