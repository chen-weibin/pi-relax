import type { FsEntry, FsRead, FsStat } from '../../extensions/contracts/fs'
import { http } from '../http'
import { classifyRead, entriesFromList, textWriteConfig } from './frames'

function header(headers: unknown, name: string): string | undefined {
	if (!headers || typeof headers !== 'object') return undefined
	const raw = (headers as Record<string, unknown>)[name]
	if (typeof raw === 'string') return raw
	if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0]
	return undefined
}

export async function listDir(path: string): Promise<FsEntry[]> {
	const { data } = await http.get('/api/fs/list', { params: { path } })
	return entriesFromList(data)
}

export async function statPath(path: string): Promise<FsStat> {
	const { data } = await http.get<FsStat>('/api/fs/stat', { params: { path } })
	return data
}

export async function readPath(path: string): Promise<FsRead> {
	const res = await http.get<ArrayBuffer>('/api/fs/read', {
		params: { path },
		responseType: 'arraybuffer',
	})
	const bytes = new Uint8Array(res.data)
	return classifyRead({
		transfer: header(res.headers, 'x-relax-transfer'),
		bytes,
	})
}

export async function writePath(path: string, text: string): Promise<void> {
	const config = textWriteConfig(path, text)
	await http.put(config.url, config.data, {
		params: config.params,
		headers: config.headers,
		transformRequest: [(data) => data],
	})
}
