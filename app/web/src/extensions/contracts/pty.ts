export type PtyCreateOptions = {
	id?: string
	cols?: number
	rows?: number
	cwd?: string
}

export type PtyErrorCode = 'NOT_FOUND' | 'NOT_IMPLEMENTED'

export class PtyError extends Error {
	readonly code: PtyErrorCode

	constructor(code: PtyErrorCode, message?: string) {
		super(message ?? code)
		this.name = 'PtyError'
		this.code = code
	}
}

export type PtyApi = {
	create(opts?: PtyCreateOptions): Promise<{ id: string }>
	write(id: string, data: string): Promise<void>
	resize(id: string, cols: number, rows: number): Promise<void>
	dispose(id: string): Promise<void>
	subscribe(id: string, onData: (chunk: string) => void): () => void
}
