import { randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, readFile, readdir, rename, rm, rmdir, stat, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, dirname, join } from 'node:path'
import type { Response } from 'express'
import { serverConfig } from '../config/server.js'
import { HttpError } from '../utils/errors.js'

export type FsKind = 'file' | 'dir'
export type FsTransfer = 'text' | 'binary'

export type FsEntry = {
	name: string
	path: string
	kind: FsKind
	size: number
	mtime: number
}

const SNIFF_BYTES = 8192

export function requireAbsolutePath(value: unknown): string {
	if (typeof value !== 'string' || value === '') {
		throw new HttpError(400, 'BAD_REQUEST', 'path 必填，且必须是绝对路径')
	}
	if (value.startsWith('~')) {
		throw new HttpError(400, 'BAD_REQUEST', 'path 不能以 ~ 开头，服务端不展开家目录，请传绝对路径')
	}
	if (!isAbsolute(value)) {
		throw new HttpError(400, 'BAD_REQUEST', `path 必须是绝对路径：${value}`)
	}
	return value
}

export function transferOf(buf: Buffer): FsTransfer {
	if (buf.includes(0)) return 'binary'
	try {
		new TextDecoder('utf-8', { fatal: true }).decode(buf)
		return 'text'
	} catch {
		return 'binary'
	}
}

/** 窗口末尾缺的后续字节数。只认 lead 后面跟不够的 10xxxxxx，最多 3 个。 */
function incompleteUtf8Tail(buf: Buffer): number {
	let i = buf.length - 1
	let cont = 0
	while (i >= 0 && cont < 3 && (buf[i] & 0xc0) === 0x80) {
		cont += 1
		i -= 1
	}
	if (i < 0) return 0
	const lead = buf[i]
	let need = 0
	if ((lead & 0xf8) === 0xf0) need = 3
	else if ((lead & 0xf0) === 0xe0) need = 2
	else if ((lead & 0xe0) === 0xc0) need = 1
	if (need === 0 || cont >= need) return 0
	return buf.length - i
}

function kindOf(isDirectory: boolean): FsKind {
	return isDirectory ? 'dir' : 'file'
}

function errno(err: unknown): string {
	return err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
}

function mapFsError(err: unknown, path: string): HttpError {
	if (err instanceof HttpError) return err
	const code = errno(err)
	if (code === 'ENOENT') return new HttpError(404, 'NOT_FOUND', `路径不存在：${path}`)
	if (code === 'EEXIST') return new HttpError(400, 'BAD_REQUEST', `路径已存在：${path}`)
	if (code === 'EACCES' || code === 'EPERM') return new HttpError(400, 'BAD_REQUEST', `没有权限访问：${path}`)
	if (code === 'ENOTDIR') return new HttpError(400, 'BAD_REQUEST', `路径中有一段不是目录：${path}`)
	if (code === 'ENOTEMPTY') return new HttpError(400, 'BAD_REQUEST', `目录非空，未带 recursive：${path}`)
	return new HttpError(500, 'INTERNAL', `访问路径失败：${path}`)
}

function tooLarge(actual: number, limit: number, what: string): HttpError {
	return new HttpError(413, 'PAYLOAD_TOO_LARGE', `${what} ${actual} 字节，超过单次上限 ${limit} 字节`)
}

function unsatisfiable(path: string, size: number): HttpError {
	return new HttpError(416, 'RANGE_NOT_SATISFIABLE', `偏移或 Range 落在文件末尾之后，文件大小 ${size} 字节：${path}`)
}

async function statOrThrow(path: string) {
	try {
		return await stat(path)
	} catch (err) {
		throw mapFsError(err, path)
	}
}

export async function listDir(path: string): Promise<{ path: string; entries: FsEntry[] }> {
	const info = await statOrThrow(path)
	if (!info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `不是目录：${path}`)
	let names: string[]
	try {
		names = await readdir(path)
	} catch (err) {
		throw mapFsError(err, path)
	}
	const entries: FsEntry[] = []
	for (const name of names) {
		const child = join(path, name)
		let childInfo
		try {
			childInfo = await stat(child)
		} catch (err) {
			if (errno(err) === 'ENOENT') continue
			throw mapFsError(err, child)
		}
		entries.push({
			name,
			path: child,
			kind: kindOf(childInfo.isDirectory()),
			size: childInfo.size,
			mtime: Math.trunc(childInfo.mtimeMs),
		})
	}
	return { path, entries }
}

export async function statPath(path: string): Promise<{ kind: FsKind; size: number; mtime: number }> {
	const info = await statOrThrow(path)
	return { kind: kindOf(info.isDirectory()), size: info.size, mtime: Math.trunc(info.mtimeMs) }
}

type Slice = { start: number; end: number }

/** end 为包含。请求跨度超过上限，或起点已在末尾之后时抛错。 */
function clampSlice(path: string, size: number, start: number, end: number, requested: number): Slice {
	const limit = serverConfig.fs.maxBytes
	if (requested > limit) throw tooLarge(requested, limit, '请求的这一段')
	if (size === 0 || start >= size) throw unsatisfiable(path, size)
	if (end < start) throw new HttpError(400, 'BAD_REQUEST', `Range 的结束位置小于开始位置：${path}`)
	return { start, end: Math.min(end, size - 1) }
}

export function sliceFromQuery(path: string, size: number, offset: number, length: number): Slice {
	if (length <= 0) throw new HttpError(400, 'BAD_REQUEST', 'length 必须大于 0')
	return clampSlice(path, size, offset, offset + length - 1, length)
}

export function sliceFromRange(path: string, size: number, header: string): Slice {
	const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim())
	if (!match) {
		throw new HttpError(400, 'BAD_REQUEST', 'Range 只支持 bytes=start-end 或 bytes=start-，不支持多段')
	}
	const start = Number(match[1])
	const open = match[2] === ''
	const end = open ? Math.max(0, size - 1) : Number(match[2])
	const requested = open ? Math.max(0, size - start) : end - start + 1
	return clampSlice(path, size, start, end, requested)
}

async function sniff(path: string, size: number): Promise<FsTransfer> {
	if (size === 0) return 'text'
	const fh = await open(path, 'r')
	try {
		const n = Math.min(SNIFF_BYTES, size)
		const buf = Buffer.alloc(n)
		await fh.read(buf, 0, n, 0)
		const direct = transferOf(buf)
		if (direct === 'text' || size <= n) return direct
		const drop = incompleteUtf8Tail(buf)
		if (drop === 0) return 'binary'
		return transferOf(buf.subarray(0, n - drop))
	} finally {
		await fh.close()
	}
}

function setTransfer(res: Response, transfer: FsTransfer) {
	res.setHeader('X-Relax-Transfer', transfer)
	res.setHeader('Accept-Ranges', 'bytes')
	res.setHeader('Content-Type', transfer === 'text' ? 'text/plain; charset=utf-8' : 'application/octet-stream')
}

export async function readFileResponse(
	path: string,
	res: Response,
	slice?: Slice,
	declared?: FsTransfer,
): Promise<void> {
	const info = await statOrThrow(path)
	if (info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `这是目录，不能读取正文：${path}`)
	if (!info.isFile()) throw new HttpError(400, 'BAD_REQUEST', `不是普通文件：${path}`)
	if (!slice) {
		const limit = serverConfig.fs.maxBytes
		if (info.size > limit) throw tooLarge(info.size, limit, '文件')
		if (declared === 'text') {
			const body = info.size === 0 ? Buffer.alloc(0) : await readFile(path)
			if (transferOf(body) !== 'text') {
				throw new HttpError(400, 'BAD_REQUEST', '声明为 text，但正文不是合法 UTF-8')
			}
			setTransfer(res, 'text')
			res.setHeader('Content-Length', body.length)
			res.status(200).end(body)
			return
		}
		setTransfer(res, declared === 'binary' ? 'binary' : await sniff(path, info.size))
		res.setHeader('Content-Length', info.size)
		res.status(200)
		if (info.size === 0) {
			res.end()
			return
		}
		// ponytail: 未声明传输类型时只看开头 8 KiB 标 text/binary，后面出现 NUL 仍可能标成 text
		const stream = createReadStream(path)
		stream.on('error', () => {
			if (!res.headersSent) res.status(500).end()
			else res.destroy()
		})
		stream.pipe(res)
		return
	}
	const length = slice.end - slice.start + 1
	const fh = await open(path, 'r')
	try {
		const buf = Buffer.alloc(length)
		const { bytesRead } = await fh.read(buf, 0, length, slice.start)
		const body = buf.subarray(0, bytesRead)
		setTransfer(res, 'binary')
		const end = slice.start + Math.max(bytesRead, 1) - 1
		res.setHeader('Content-Range', `bytes ${slice.start}-${end}/${info.size}`)
		res.setHeader('Content-Length', body.length)
		res.status(206).end(body)
	} finally {
		await fh.close()
	}
}

export async function readBody(
	req: AsyncIterable<unknown> & { destroy?: () => void },
	declared: number | undefined,
): Promise<Buffer> {
	const limit = serverConfig.fs.maxBytes
	if (declared !== undefined && declared > limit) throw tooLarge(declared, limit, '这一次写入')
	const chunks: Buffer[] = []
	let total = 0
	for await (const chunk of req) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
		total += buf.length
		if (total > limit) {
			req.destroy?.()
			throw tooLarge(total, limit, '这一次写入')
		}
		chunks.push(buf)
	}
	return Buffer.concat(chunks)
}

async function ensureParent(path: string, recursive: boolean) {
	const parent = dirname(path)
	try {
		const info = await stat(parent)
		if (!info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `父路径不是目录：${parent}`)
	} catch (err) {
		if (err instanceof HttpError) throw err
		if (errno(err) === 'ENOENT' && recursive) {
			await mkdir(parent, { recursive: true })
			return
		}
		throw mapFsError(err, parent)
	}
}

async function existingFile(path: string) {
	try {
		return await stat(path)
	} catch (err) {
		if (errno(err) === 'ENOENT') return undefined
		throw mapFsError(err, path)
	}
}

export async function writeWholeFile(path: string, body: Buffer, transfer: FsTransfer, recursive: boolean): Promise<void> {
	const existing = await existingFile(path)
	if (existing?.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `目标是目录，不能当作文件写入：${path}`)
	if (transfer === 'text' && transferOf(body) !== 'text') {
		throw new HttpError(400, 'BAD_REQUEST', '声明为 text，但正文不是合法 UTF-8')
	}
	await ensureParent(path, recursive)
	const tmp = `${path}.${randomBytes(8).toString('hex')}.relax-tmp`
	try {
		await writeFile(tmp, body)
		await rename(tmp, path)
	} catch (err) {
		await unlink(tmp).catch(() => {})
		throw mapFsError(err, path)
	}
}

export async function writeAtOffset(path: string, body: Buffer, offset: number, recursive: boolean): Promise<void> {
	const existing = await existingFile(path)
	if (existing?.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `目标是目录，不能当作文件写入：${path}`)
	if (!existing && offset > 0) throw new HttpError(400, 'BAD_REQUEST', `文件不存在，offset 不能大于 0：${path}`)
	if (existing && offset > existing.size) {
		throw new HttpError(400, 'BAD_REQUEST', `offset ${offset} 大于当前长度 ${existing.size}，不能写出空洞：${path}`)
	}
	await ensureParent(path, recursive)
	if (!existing) {
		await writeFile(path, body)
		return
	}
	const fh = await open(path, 'r+')
	try {
		await fh.write(body, 0, body.length, offset)
	} finally {
		await fh.close()
	}
}

export async function makeDir(path: string, recursive: boolean): Promise<void> {
	if (await existingFile(path)) throw new HttpError(400, 'BAD_REQUEST', `路径已存在：${path}`)
	await ensureParent(path, recursive)
	try {
		await mkdir(path)
	} catch (err) {
		throw mapFsError(err, path)
	}
}

export async function removeFile(path: string): Promise<void> {
	const info = await statOrThrow(path)
	if (info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `这是目录，请使用删除目录接口：${path}`)
	try {
		await unlink(path)
	} catch (err) {
		throw mapFsError(err, path)
	}
}

export async function removeDir(path: string, recursive: boolean): Promise<void> {
	const info = await statOrThrow(path)
	if (!info.isDirectory()) throw new HttpError(400, 'BAD_REQUEST', `这是文件，请使用删除文件接口：${path}`)
	try {
		if (recursive) await rm(path, { recursive: true })
		else await rmdir(path)
	} catch (err) {
		throw mapFsError(err, path)
	}
}
