export type FsKind = 'file' | 'dir'

export type FsEntry = {
	name: string
	path: string
	kind: FsKind
	size: number
}

export type FsErrorCode = 'NOT_FOUND' | 'NOT_IMPLEMENTED' | 'PERMISSION'

export class FsError extends Error {
	readonly code: FsErrorCode

	constructor(code: FsErrorCode, message?: string) {
		super(message ?? code)
		this.name = 'FsError'
		this.code = code
	}
}

export type FsStat = {
	kind: FsKind
	size: number
	mtime: number
}

export type FsRead = { kind: 'text'; text: string } | { kind: 'blocked'; reason: string }

export type FsApi = {
	list(path: string): Promise<FsEntry[]>
	stat(path: string): Promise<FsStat>
	read(path: string): Promise<FsRead>
	write(path: string, text: string): Promise<void>
}
