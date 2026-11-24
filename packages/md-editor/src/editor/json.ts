import { editorSchema } from './schema.ts'
import type { DocJson } from './types'

export function createEmptyDocJson(): DocJson {
	return editorSchema.nodes.doc.create(null, editorSchema.nodes.paragraph.create()).toJSON() as DocJson
}
