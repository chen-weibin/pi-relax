import { Router, type Request } from 'express'
import {
	AVATAR_MAX_BYTES,
	AVATAR_MIMES,
	deleteAvatar,
	normalizeDisplayName,
	normalizeGeneratedAvatar,
	patchProfile,
	putAvatar,
	readAvatarFile,
	readProfile,
	type AvatarMime,
	type ProfilePatch,
} from '../profile/store.js'
import { asyncHandler, HttpError } from '../utils/errors.js'

export function profileRouter(): Router {
	const router = Router()

	router.get('/api/profile', (_req, res) => {
		res.json(readProfile())
	})

	router.patch(
		'/api/profile',
		asyncHandler(async (req, res) => {
			const patch = profilePatch(req.body)
			res.json(patchProfile(patch))
		}),
	)

	router.put(
		'/api/profile/avatar',
		asyncHandler(async (req, res) => {
			const mime = avatarMime(req.headers['content-type'])
			const body = await readAvatarBody(req)
			res.json(putAvatar(body, mime))
		}),
	)

	router.get('/api/profile/avatar', (_req, res) => {
		const { body, mime } = readAvatarFile()
		res.setHeader('Content-Type', mime)
		res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')
		res.send(body)
	})

	router.delete('/api/profile/avatar', (_req, res) => {
		res.json(deleteAvatar())
	})

	return router
}

function profilePatch(body: unknown): ProfilePatch {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new HttpError(400, 'BAD_REQUEST', 'JSON object required')
	}
	const record = body as Record<string, unknown>
	const keys = Object.keys(record)
	if (keys.length === 0) throw new HttpError(400, 'BAD_REQUEST', 'At least one field is required')
	for (const key of keys) {
		if (key !== 'displayName' && key !== 'avatar') {
			throw new HttpError(400, 'BAD_REQUEST', `Unknown field: ${key}`)
		}
	}
	const patch: ProfilePatch = {}
	if ('displayName' in record) patch.displayName = normalizeDisplayName(record.displayName)
	if ('avatar' in record) patch.avatar = normalizeGeneratedAvatar(record.avatar)
	return patch
}

function avatarMime(header: string | undefined): AvatarMime {
	const raw = header?.split(';')[0]?.trim().toLowerCase()
	const mime = AVATAR_MIMES.find((item) => item === raw)
	if (!mime) throw new HttpError(400, 'BAD_REQUEST', 'Content-Type must be image/png, image/jpeg, or image/webp')
	return mime
}

async function readAvatarBody(req: Request): Promise<Buffer> {
	const declared = contentLength(req.headers['content-length'])
	if (declared !== undefined && declared > AVATAR_MAX_BYTES) {
		throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `Avatar exceeds ${AVATAR_MAX_BYTES} bytes`)
	}
	const chunks: Buffer[] = []
	let total = 0
	for await (const chunk of req) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
		total += buf.length
		if (total > AVATAR_MAX_BYTES) {
			req.destroy()
			throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `Avatar exceeds ${AVATAR_MAX_BYTES} bytes`)
		}
		chunks.push(buf)
	}
	return Buffer.concat(chunks)
}

function contentLength(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const n = Number(value)
	return Number.isFinite(n) && n >= 0 ? n : undefined
}
