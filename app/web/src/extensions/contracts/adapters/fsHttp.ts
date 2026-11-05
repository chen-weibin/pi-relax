import { listDir, readPath, statPath, writePath } from '../../../api/fs'
import { ApiError } from '../../../api/http'
import { FsError, type FsApi } from '../fs'

function toFs(err: unknown): never {
	if (err instanceof ApiError && (err.status === 404 || err.code === 'NOT_FOUND')) {
		throw new FsError('NOT_FOUND', err.message)
	}
	if (err instanceof Error) throw err
	throw new Error('访问文件失败')
}

async function wrap<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run()
	} catch (err) {
		toFs(err)
	}
}

export const fsApi: FsApi = {
	list: (path) => wrap(() => listDir(path)),
	stat: (path) => wrap(() => statPath(path)),
	read: (path) => wrap(() => readPath(path)),
	write: (path, text) => wrap(() => writePath(path, text)),
}
