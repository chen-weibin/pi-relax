import { SettingsIcon } from '../icons'
import { IconButton } from '../ui/IconButton'
import { Preview } from './frame'

const cells = [
	{ label: 'ghost / sm', variant: 'ghost', size: 'sm', disabled: false },
	{ label: 'ghost / md', variant: 'ghost', size: 'md', disabled: false },
	{ label: 'solid / sm', variant: 'solid', size: 'sm', disabled: false },
	{ label: 'solid / md', variant: 'solid', size: 'md', disabled: false },
	{ label: 'disabled', variant: 'ghost', size: 'md', disabled: true },
] as const

function IconButtonDemo() {
	return (
		<div className="grid grid-cols-2 gap-4">
			{cells.map((cell) => (
				<Preview key={cell.label} label={cell.label}>
					<IconButton
						title="设置"
						variant={cell.variant}
						size={cell.size}
						disabled={cell.disabled}
					>
						<SettingsIcon />
					</IconButton>
				</Preview>
			))}
		</div>
	)
}

export const iconButtonDoc = {
	id: 'icon-button',
	heading: 'IconButton',
	description: '带提示的图标按钮。下面是 ghost / solid、sm / md，以及禁用。',
	nav: ['IconButton'],
	Demo: IconButtonDemo,
}
