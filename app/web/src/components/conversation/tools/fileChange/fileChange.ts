export type DiffStats = {
	additions: number
	deletions: number
}

export type FileChangeArgs = {
	path: string
	/** write 的全文。edit 没有。 */
	content: string | null
	/** edit 是否已能从参数认出至少一段替换（仅用于参数是否齐）。 */
	hasEdits: boolean
}

function isSingleEdit(value: unknown): value is { oldText: string; newText: string } {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	const edit = value as Record<string, unknown>
	return typeof edit.oldText === 'string' && typeof edit.newText === 'string'
}

/** 路径最后一段。空串原样返回。 */
export function fileBasename(path: string): string {
	if (!path) return ''
	return path.split('/').filter(Boolean).pop() ?? path
}

/**
 * write / edit 共用的参数读取。流式期 args 为 null 时返回空。
 *
 * edit 还认几种怪形状：`edits` 是 JSON 字符串、单个对象，或顶层 `oldText`/`newText`。
 */
export function parseFileChangeArgs(args: Record<string, unknown> | null): FileChangeArgs {
	if (!args) return { path: '', content: null, hasEdits: false }

	const path =
		typeof args.path === 'string' ? args.path : typeof args.file_path === 'string' ? args.file_path : ''
	const content = typeof args.content === 'string' ? args.content : null

	let hasEdits = false
	if (Array.isArray(args.edits) && args.edits.length > 0) {
		hasEdits = args.edits.every(isSingleEdit)
	} else if (typeof args.edits === 'string') {
		try {
			const parsed = JSON.parse(args.edits)
			hasEdits = Array.isArray(parsed)
				? parsed.length > 0 && parsed.every(isSingleEdit)
				: isSingleEdit(parsed)
		} catch {
			hasEdits = false
		}
	} else if (isSingleEdit(args.edits)) {
		hasEdits = true
	} else if (typeof args.oldText === 'string' && typeof args.newText === 'string') {
		hasEdits = true
	}

	return { path, content, hasEdits }
}

/** write：content 行数作 additions。空串 0。 */
export function countWriteStats(content: string): DiffStats {
	if (!content) return { additions: 0, deletions: 0 }
	const lines = content.split('\n')
	// 末尾空行不算一行（和常见 diff 观感一致）。
	const count = lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
	return { additions: count === 0 && content.length > 0 ? 1 : count, deletions: 0 }
}

/** edit：数 unified patch 里以 +/− 开头、不是 +++ / --- 的行。 */
export function countPatchStats(patch: string): DiffStats {
	let additions = 0
	let deletions = 0
	for (const line of patch.split('\n')) {
		if (line.startsWith('+++') || line.startsWith('---')) continue
		if (line.startsWith('+')) additions += 1
		else if (line.startsWith('-')) deletions += 1
	}
	return { additions, deletions }
}

/** 从工具 details 里取出 patch 字符串。 */
export function editPatchFromDetails(details: unknown): string | null {
	if (!details || typeof details !== 'object' || Array.isArray(details)) return null
	const patch = (details as { patch?: unknown }).patch
	return typeof patch === 'string' && patch !== '' ? patch : null
}
