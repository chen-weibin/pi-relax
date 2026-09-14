import type { Node as PMNode } from 'prosemirror-model'
import { schema } from './schema'

/** Flatten doc to plain text; paragraphs joined by `\n`. */
export function docToText(doc: PMNode): string {
	const parts: string[] = []
	doc.forEach((node) => {
		parts.push(node.textContent)
	})
	return parts.join('\n')
}

/** Build a doc from plain text; `\n` starts a new paragraph. */
export function textToDoc(text: string): PMNode {
	const lines = text.split('\n')
	const paragraphs = lines.map((line) =>
		schema.node('paragraph', null, line ? [schema.text(line)] : []),
	)
	return schema.node('doc', null, paragraphs.length > 0 ? paragraphs : [schema.node('paragraph')])
}

export function isDocEmpty(doc: PMNode): boolean {
	return doc.childCount === 1 && doc.firstChild!.content.size === 0
}
