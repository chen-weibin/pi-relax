import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getRelaxHome } from '../config/home.js'
import { relaxDb } from '../db/connection.js'
import { HttpError } from '../utils/errors.js'

export const AVATAR_SHAPES = ['circle', 'blob', 'roundedSquare'] as const
export const AVATAR_EXPRESSIONS = [
	'neutral',
	'happy',
	'thinking',
	'surprised',
	'sad',
	'wink',
	'sleepy',
	'excited',
] as const
export const AVATAR_MODES = ['generated', 'custom'] as const
export const AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export type AvatarShape = (typeof AVATAR_SHAPES)[number]
export type AvatarExpression = (typeof AVATAR_EXPRESSIONS)[number]
export type AvatarMode = (typeof AVATAR_MODES)[number]
export type AvatarMime = (typeof AVATAR_MIMES)[number]

export type GeneratedAvatar = {
	mode: 'generated'
	shape: AvatarShape
	expression: AvatarExpression
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
		shape?: AvatarShape
		expression?: AvatarExpression
		color?: string
	}
}

type ProfileRow = {
	display_name: string
	avatar_mode: string
	avatar_shape: string | null
	avatar_expression: string | null
	avatar_color: string | null
	avatar_mime: string | null
	modified: string
}

const PROFILE_ID = 'default'
const DEFAULT_NAME = 'chen'
const DEFAULT_SHAPE: AvatarShape = 'circle'
const DEFAULT_EXPRESSION: AvatarExpression = 'neutral'
const DEFAULT_COLOR = '#f4f4f1'

const HEX = /^#[0-9a-f]{6}$/i

export function avatarFilePath(): string {
	return join(getRelaxHome(), 'profile', 'avatar')
}

export function readProfile(): Profile {
	const row = ensureRow()
	return toProfile(row)
}

export function patchProfile(patch: ProfilePatch): Profile {
	const row = ensureRow()
	const next = { ...row }
	if (patch.displayName !== undefined) next.display_name = patch.displayName
	if (patch.avatar) {
		next.avatar_mode = 'generated'
		next.avatar_shape = patch.avatar.shape ?? row.avatar_shape ?? DEFAULT_SHAPE
		next.avatar_expression = patch.avatar.expression ?? row.avatar_expression ?? DEFAULT_EXPRESSION
		next.avatar_color = patch.avatar.color ?? row.avatar_color ?? DEFAULT_COLOR
		next.avatar_mime = null
		removeAvatarFile()
	}
	next.modified = new Date().toISOString()
	writeRow(next)
	return toProfile(next)
}

export function putAvatar(body: Buffer, mime: AvatarMime): Profile {
	if (body.length === 0) throw new HttpError(400, 'BAD_REQUEST', 'Empty avatar body')
	if (body.length > AVATAR_MAX_BYTES) {
		throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `Avatar exceeds ${AVATAR_MAX_BYTES} bytes`)
	}
	const detected = detectMime(body)
	if (!detected) throw new HttpError(400, 'BAD_REQUEST', 'Avatar must be PNG, JPEG, or WebP')
	if (detected !== mime) {
		throw new HttpError(400, 'BAD_REQUEST', `Content-Type ${mime} does not match body (${detected})`)
	}
	const row = ensureRow()
	mkdirSync(join(getRelaxHome(), 'profile'), { recursive: true })
	writeFileSync(avatarFilePath(), body)
	const next: ProfileRow = {
		...row,
		avatar_mode: 'custom',
		avatar_mime: mime,
		modified: new Date().toISOString(),
	}
	writeRow(next)
	return toProfile(next)
}

export function readAvatarFile(): { body: Buffer; mime: AvatarMime } {
	const row = ensureRow()
	if (row.avatar_mode !== 'custom' || !row.avatar_mime) {
		throw new HttpError(404, 'NOT_FOUND', 'No custom avatar')
	}
	const path = avatarFilePath()
	if (!existsSync(path)) throw new HttpError(404, 'NOT_FOUND', 'No custom avatar')
	const mime = AVATAR_MIMES.find((item) => item === row.avatar_mime)
	if (!mime) throw new HttpError(404, 'NOT_FOUND', 'No custom avatar')
	return { body: readFileSync(path), mime }
}

export function deleteAvatar(): Profile {
	const row = ensureRow()
	removeAvatarFile()
	const next: ProfileRow = {
		...row,
		avatar_mode: 'generated',
		avatar_shape: row.avatar_shape ?? DEFAULT_SHAPE,
		avatar_expression: row.avatar_expression ?? DEFAULT_EXPRESSION,
		avatar_color: row.avatar_color ?? DEFAULT_COLOR,
		avatar_mime: null,
		modified: new Date().toISOString(),
	}
	writeRow(next)
	return toProfile(next)
}

function ensureRow(): ProfileRow {
	const db = relaxDb()
	const existing = db.prepare(`SELECT * FROM user_profile WHERE id = ?`).get(PROFILE_ID) as ProfileRow | undefined
	if (existing) return existing
	const row: ProfileRow = {
		display_name: DEFAULT_NAME,
		avatar_mode: 'generated',
		avatar_shape: DEFAULT_SHAPE,
		avatar_expression: DEFAULT_EXPRESSION,
		avatar_color: DEFAULT_COLOR,
		avatar_mime: null,
		modified: new Date().toISOString(),
	}
	writeRow(row)
	return row
}

function writeRow(row: ProfileRow): void {
	relaxDb()
		.prepare(
			`INSERT INTO user_profile (
				id, display_name, avatar_mode, avatar_shape, avatar_expression, avatar_color, avatar_mime, modified
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				display_name = excluded.display_name,
				avatar_mode = excluded.avatar_mode,
				avatar_shape = excluded.avatar_shape,
				avatar_expression = excluded.avatar_expression,
				avatar_color = excluded.avatar_color,
				avatar_mime = excluded.avatar_mime,
				modified = excluded.modified`,
		)
		.run(
			PROFILE_ID,
			row.display_name,
			row.avatar_mode,
			row.avatar_shape,
			row.avatar_expression,
			row.avatar_color,
			row.avatar_mime,
			row.modified,
		)
}

function toProfile(row: ProfileRow): Profile {
	if (row.avatar_mode === 'custom' && existsSync(avatarFilePath())) {
		return {
			displayName: row.display_name,
			avatar: {
				mode: 'custom',
				url: `/api/profile/avatar?t=${encodeURIComponent(row.modified)}`,
			},
		}
	}
	return {
		displayName: row.display_name,
		avatar: {
			mode: 'generated',
			shape: shapeOf(row.avatar_shape) ?? DEFAULT_SHAPE,
			expression: expressionOf(row.avatar_expression) ?? DEFAULT_EXPRESSION,
			color: colorOf(row.avatar_color) ?? DEFAULT_COLOR,
		},
	}
}

function removeAvatarFile(): void {
	const path = avatarFilePath()
	if (!existsSync(path)) return
	unlinkSync(path)
}

function shapeOf(value: string | null): AvatarShape | undefined {
	return AVATAR_SHAPES.find((item) => item === value)
}

function expressionOf(value: string | null): AvatarExpression | undefined {
	return AVATAR_EXPRESSIONS.find((item) => item === value)
}

function colorOf(value: string | null): string | undefined {
	if (!value || !HEX.test(value)) return undefined
	return value.toLowerCase()
}

export function detectMime(body: Buffer): AvatarMime | undefined {
	if (body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
		return 'image/png'
	}
	if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
		return 'image/jpeg'
	}
	if (
		body.length >= 12 &&
		body[0] === 0x52 &&
		body[1] === 0x49 &&
		body[2] === 0x46 &&
		body[3] === 0x46 &&
		body[8] === 0x57 &&
		body[9] === 0x45 &&
		body[10] === 0x42 &&
		body[11] === 0x50
	) {
		return 'image/webp'
	}
	return undefined
}

export function normalizeDisplayName(value: unknown): string {
	if (typeof value !== 'string') throw new HttpError(400, 'BAD_REQUEST', 'displayName must be a string')
	const name = value.trim()
	if (name.length < 1 || name.length > 64) {
		throw new HttpError(400, 'BAD_REQUEST', 'displayName must be 1–64 characters')
	}
	return name
}

export function normalizeGeneratedAvatar(value: unknown): ProfilePatch['avatar'] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new HttpError(400, 'BAD_REQUEST', 'avatar must be an object')
	}
	const record = value as Record<string, unknown>
	if (record.mode !== 'generated') {
		throw new HttpError(400, 'BAD_REQUEST', 'avatar.mode must be generated')
	}
	const avatar: NonNullable<ProfilePatch['avatar']> = { mode: 'generated' }
	if ('shape' in record) {
		if (!AVATAR_SHAPES.includes(record.shape as AvatarShape)) {
			throw new HttpError(400, 'BAD_REQUEST', `avatar.shape must be one of ${AVATAR_SHAPES.join(', ')}`)
		}
		avatar.shape = record.shape as AvatarShape
	}
	if ('expression' in record) {
		if (!AVATAR_EXPRESSIONS.includes(record.expression as AvatarExpression)) {
			throw new HttpError(400, 'BAD_REQUEST', `avatar.expression must be one of ${AVATAR_EXPRESSIONS.join(', ')}`)
		}
		avatar.expression = record.expression as AvatarExpression
	}
	if ('color' in record) {
		if (typeof record.color !== 'string' || !HEX.test(record.color)) {
			throw new HttpError(400, 'BAD_REQUEST', 'avatar.color must be a #rrggbb hex')
		}
		avatar.color = record.color.toLowerCase()
	}
	return avatar
}
