import { formatByteSize } from '../../../formatByteSize.ts'
import type { FileKind } from './fileKinds'

/** 与后端 `fs.maxBytes` 默认值相同。不读 config.json。 */
export const FS_MAX_BYTES = 16 * 1024 * 1024

export const UNSUPPORTED_TYPE = '当前不支持该文件类型'

export function tooLargeReason(size: number): string {
	return `文件过大（${formatByteSize(size)}），当前不支持展示`
}

/** 返回挡住原因。`null` 表示可以整文件读取。非文本不看大小。 */
export function openBlockReason(kind: FileKind, size: number): string | null {
	if (kind.open !== 'text') return UNSUPPORTED_TYPE
	if (size > FS_MAX_BYTES) return tooLargeReason(size)
	return null
}
