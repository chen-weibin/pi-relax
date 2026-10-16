import { Router } from 'express'
import { asyncHandler, HttpError } from '../utils/errors.js'
import {
	listDir,
	makeDir,
	readBody,
	readFileResponse,
	removeDir,
	removeFile,
	requireAbsolutePath,
	sliceFromQuery,
	sliceFromRange,
	statPath,
	writeAtOffset,
	writeWholeFile,
	type FsTransfer,
} from '../fs/ops.js'

function one(value: unknown): string | undefined {
	if (typeof value === 'string') return value
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
	return undefined
}

function optionalCount(value: unknown, name: string): number | undefined {
	const raw = one(value)
	if (raw === undefined || raw === '') return undefined
	if (!/^\d+$/.test(raw)) throw new HttpError(400, 'BAD_REQUEST', `${name} 必须是非负整数`)
	return Number(raw)
}

function flag(value: unknown): boolean {
	if (value === undefined || value === false || value === 'false' || value === '') return false
	if (value === true || value === 'true') return true
	throw new HttpError(400, 'BAD_REQUEST', 'recursive 只能是 true 或 false')
}

function transferOfHeader(value: unknown): FsTransfer {
	const raw = Array.isArray(value) ? value[0] : value
	if (raw === undefined) {
		throw new HttpError(400, 'BAD_REQUEST', '缺少请求头 X-Relax-Transfer，取值为 text 或 binary')
	}
	if (raw !== 'text' && raw !== 'binary') {
		throw new HttpError(400, 'BAD_REQUEST', 'X-Relax-Transfer 只能是 text 或 binary')
	}
	return raw
}

function pathQuery(value: unknown): string {
	return requireAbsolutePath(one(value))
}

export function fsRouter(): Router {
	const router = Router()

	router.get(
		'/api/fs/list',
		asyncHandler(async (req, res) => {
			res.json(await listDir(pathQuery(req.query.path)))
		}),
	)

	router.get(
		'/api/fs/stat',
		asyncHandler(async (req, res) => {
			res.json(await statPath(pathQuery(req.query.path)))
		}),
	)

	router.get(
		'/api/fs/read',
		asyncHandler(async (req, res) => {
			const path = pathQuery(req.query.path)
			const offset = optionalCount(req.query.offset, 'offset')
			const length = optionalCount(req.query.length, 'length')
			const range = one(req.headers.range)
			if (range && (offset !== undefined || length !== undefined)) {
				throw new HttpError(400, 'BAD_REQUEST', 'Range 和 offset/length 只能选一种')
			}
			if ((offset === undefined) !== (length === undefined)) {
				throw new HttpError(400, 'BAD_REQUEST', 'offset 和 length 必须同时提供')
			}
			const meta = await statPath(path)
			if (meta.kind !== 'file') throw new HttpError(400, 'BAD_REQUEST', `这是目录，不能读取正文：${path}`)
			const slice = range
				? sliceFromRange(path, meta.size, range)
				: offset !== undefined && length !== undefined
					? sliceFromQuery(path, meta.size, offset, length)
					: undefined
			await readFileResponse(path, res, slice)
		}),
	)

	router.put(
		'/api/fs/file',
		asyncHandler(async (req, res) => {
			const type = one(req.headers['content-type']) ?? ''
			if (type.includes('application/json')) {
				throw new HttpError(400, 'BAD_REQUEST', '文件正文不要用 application/json，请发送原始字节并设置 X-Relax-Transfer')
			}
			const path = pathQuery(req.query.path)
			const transfer = transferOfHeader(req.headers['x-relax-transfer'])
			const recursive = flag(one(req.query.recursive))
			const offset = optionalCount(req.query.offset, 'offset')
			const declared = optionalCount(req.headers['content-length'], 'Content-Length')
			const body = await readBody(req, declared)
			if (offset === undefined) await writeWholeFile(path, body, transfer, recursive)
			else {
				if (transfer !== 'binary') {
					throw new HttpError(400, 'BAD_REQUEST', '分段续传只接受 binary，避免一个字符被切在两段中间')
				}
				await writeAtOffset(path, body, offset, recursive)
			}
			res.status(204).end()
		}),
	)

	router.post(
		'/api/fs/dir',
		asyncHandler(async (req, res) => {
			const body = req.body as { path?: unknown; recursive?: unknown }
			await makeDir(requireAbsolutePath(body?.path), flag(body?.recursive))
			res.status(204).end()
		}),
	)

	router.delete(
		'/api/fs/file',
		asyncHandler(async (req, res) => {
			await removeFile(pathQuery(req.query.path))
			res.status(204).end()
		}),
	)

	router.delete(
		'/api/fs/dir',
		asyncHandler(async (req, res) => {
			await removeDir(pathQuery(req.query.path), flag(one(req.query.recursive)))
			res.status(204).end()
		}),
	)

	return router
}
