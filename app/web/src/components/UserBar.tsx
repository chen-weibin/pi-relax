import { IconButton } from '../ui/IconButton'
import { SettingsIcon } from '../icons'
import { useCommonStore } from '../store'

const USER_NAME = 'chen'
const AVATAR_URL = 'https://api.dicebear.com/9.x/avataaars/svg?seed=chen'

export function UserBar() {
	const toggleSetting = useCommonStore((s) => s.toggleSetting)
	return (
		<div className="mt-auto flex h-[48px] items-center justify-between gap-2 px-3">
			<div className="flex min-w-0 items-center gap-2.5">
				<img
					src={AVATAR_URL}
					alt=""
					className="h-7 w-7 shrink-0 rounded-full bg-surface"
				/>
				<span className="truncate text-md text-fg-2">{USER_NAME}</span>
			</div>
			<IconButton title="设置" onClick={toggleSetting}>
				<SettingsIcon />
			</IconButton>
		</div>
	)
}
