import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { avatarImageUrl } from '../api/profile'
import { IconButton } from '../ui/IconButton'
import { Avatar, colorsFromBody } from '../ui/Avatar'
import { SettingsIcon } from '../icons'
import { useCommonStore, useProfileStore } from '../store'

export function UserBar() {
	const toggleSetting = useCommonStore((s) => s.toggleSetting)
	const { profile, loadProfile } = useProfileStore(
		useShallow((s) => ({
			profile: s.profile,
			loadProfile: s.loadProfile,
		})),
	)

	useEffect(() => {
		void loadProfile()
	}, [loadProfile])

	const displayName = profile?.displayName ?? '…'

	return (
		<div className="mt-auto flex h-[48px] items-center justify-between gap-2 px-3">
			<div className="flex min-w-0 items-center gap-2.5">
				{profile?.avatar.mode === 'custom' ? (
					<img
						src={avatarImageUrl(profile.avatar.url)}
						alt=""
						className="h-7 w-7 shrink-0 rounded-full bg-surface object-cover"
					/>
				) : (
					<Avatar
						size={28}
						shape={profile?.avatar.mode === 'generated' ? profile.avatar.shape : 'circle'}
						expression={profile?.avatar.mode === 'generated' ? profile.avatar.expression : 'neutral'}
						colors={{
							...colorsFromBody(
								profile?.avatar.mode === 'generated' ? profile.avatar.color : '#f4f4f1',
							),
							background: 'transparent',
						}}
						label={displayName}
						className="shrink-0"
					/>
				)}
				<span className="truncate text-md text-fg-2">{displayName}</span>
			</div>
			<IconButton title="设置" onClick={toggleSetting}>
				<SettingsIcon />
			</IconButton>
		</div>
	)
}
