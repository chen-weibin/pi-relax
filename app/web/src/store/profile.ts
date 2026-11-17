import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
	deleteAvatar as deleteAvatarApi,
	getProfile,
	patchProfile,
	putAvatar as putAvatarApi,
	type GeneratedAvatar,
	type Profile,
	type ProfilePatch,
} from '../api/profile'

type ProfileState = {
	profile: Profile | null
	loading: boolean
	loadError: string | null
	loadProfile: () => Promise<void>
	setDisplayName: (displayName: string) => Promise<Profile>
	setGeneratedAvatar: (avatar: {
		shape?: GeneratedAvatar['shape']
		expression?: GeneratedAvatar['expression']
		color?: string
	}) => Promise<Profile>
	uploadAvatar: (file: Blob, mime: string) => Promise<Profile>
	clearCustomAvatar: () => Promise<Profile>
}

let loadPromise: Promise<void> | null = null

export const useProfileStore = create<ProfileState>()(
	immer((set, get) => ({
		profile: null,
		loading: false,
		loadError: null,

		loadProfile: async () => {
			if (get().profile) return
			if (loadPromise) return loadPromise
			set((s) => {
				s.loading = true
				s.loadError = null
			})
			loadPromise = getProfile()
				.then((profile) => {
					set((s) => {
						s.profile = profile
						s.loading = false
					})
				})
				.catch((err: unknown) => {
					const message = err instanceof Error ? err.message : '加载用户资料失败'
					set((s) => {
						s.loading = false
						s.loadError = message
					})
				})
				.finally(() => {
					loadPromise = null
				})
			return loadPromise
		},

		setDisplayName: async (displayName) => {
			const profile = await patchProfile({ displayName })
			set((s) => {
				s.profile = profile
			})
			return profile
		},

		setGeneratedAvatar: async (avatar) => {
			const patch: ProfilePatch = {
				avatar: {
					mode: 'generated',
					shape: avatar.shape,
					expression: avatar.expression,
					color: avatar.color,
				},
			}
			const profile = await patchProfile(patch)
			set((s) => {
				s.profile = profile
			})
			return profile
		},

		uploadAvatar: async (file, mime) => {
			const profile = await putAvatarApi(file, mime)
			set((s) => {
				s.profile = profile
			})
			return profile
		},

		clearCustomAvatar: async () => {
			const profile = await deleteAvatarApi()
			set((s) => {
				s.profile = profile
			})
			return profile
		},
	})),
)
