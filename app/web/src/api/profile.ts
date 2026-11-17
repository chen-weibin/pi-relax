import { http } from './http'
import { config } from '../config'

export type GeneratedAvatar = {
	mode: 'generated'
	shape: 'circle' | 'blob' | 'roundedSquare'
	expression:
		| 'neutral'
		| 'happy'
		| 'thinking'
		| 'surprised'
		| 'sad'
		| 'wink'
		| 'sleepy'
		| 'excited'
	color: string
}

export type CustomAvatar = {
	mode: 'custom'
	url: string
}

export type Profile = {
	displayName: string
	avatar: GeneratedAvatar | CustomAvatar
}

export type ProfilePatch = {
	displayName?: string
	avatar?: {
		mode: 'generated'
		shape?: GeneratedAvatar['shape']
		expression?: GeneratedAvatar['expression']
		color?: string
	}
}

export async function getProfile(): Promise<Profile> {
	const { data } = await http.get<Profile>('/api/profile')
	return data
}

export async function patchProfile(patch: ProfilePatch): Promise<Profile> {
	const { data } = await http.patch<Profile>('/api/profile', patch)
	return data
}

export async function putAvatar(file: Blob, mime: string): Promise<Profile> {
	const { data } = await http.put<Profile>('/api/profile/avatar', file, {
		headers: { 'Content-Type': mime },
	})
	return data
}

export async function deleteAvatar(): Promise<Profile> {
	const { data } = await http.delete<Profile>('/api/profile/avatar')
	return data
}

/** 把 API 返回的相对 path 拼成可给 `<img src>` 用的绝对地址。 */
export function avatarImageUrl(url: string): string {
	if (/^https?:\/\//i.test(url)) return url
	return `${config.apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`
}
