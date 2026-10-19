import type { ComponentType } from 'react'
import {
	FileCssIcon,
	FileHtmlIcon,
	FileJsIcon,
	FileJsonIcon,
	FileMarkdownIcon,
	FilePackageJsonIcon,
	FileTsIcon,
	FileTsxIcon,
	FileTxtIcon,
	FileUnknownIcon,
} from '../../../icons'

export type FileViewerId = 'monaco'

export type FileKind = {
	id: string
	names?: string[]
	extensions?: string[]
	icon: ComponentType
	viewer: FileViewerId
	language?: string
}

export const unknownFileKind: FileKind = {
	id: 'unknown',
	icon: FileUnknownIcon,
	viewer: 'monaco',
	language: 'plaintext',
}

export const fileKinds: FileKind[] = [
	{
		id: 'md',
		extensions: ['md', 'markdown'],
		icon: FileMarkdownIcon,
		viewer: 'monaco',
		language: 'markdown',
	},
	{
		id: 'txt',
		extensions: ['txt'],
		icon: FileTxtIcon,
		viewer: 'monaco',
		language: 'plaintext',
	},
	{
		id: 'js',
		extensions: ['js', 'mjs', 'cjs'],
		icon: FileJsIcon,
		viewer: 'monaco',
		language: 'javascript',
	},
	{
		id: 'ts',
		extensions: ['ts'],
		icon: FileTsIcon,
		viewer: 'monaco',
		language: 'typescript',
	},
	{
		id: 'tsx',
		extensions: ['tsx'],
		icon: FileTsxIcon,
		viewer: 'monaco',
		language: 'typescript',
	},
	{
		id: 'css',
		extensions: ['css'],
		icon: FileCssIcon,
		viewer: 'monaco',
		language: 'css',
	},
	{
		id: 'html',
		extensions: ['html', 'htm'],
		icon: FileHtmlIcon,
		viewer: 'monaco',
		language: 'html',
	},
	{
		id: 'package-json',
		names: ['package.json'],
		icon: FilePackageJsonIcon,
		viewer: 'monaco',
		language: 'json',
	},
	{
		id: 'json',
		extensions: ['json'],
		icon: FileJsonIcon,
		viewer: 'monaco',
		language: 'json',
	},
]

export function extensionFromPath(path: string) {
	const name = path.split('/').filter(Boolean).pop() ?? ''
	const dot = name.lastIndexOf('.')
	if (dot <= 0) return ''
	return name.slice(dot + 1).toLowerCase()
}

export function resolveFileKind(path: string): FileKind {
	const name = (path.split('/').filter(Boolean).pop() ?? '').toLowerCase()
	const byName = fileKinds.find((kind) =>
		kind.names?.some((item) => item.toLowerCase() === name),
	)
	if (byName) return byName
	const ext = extensionFromPath(path)
	if (ext) {
		const byExt = fileKinds.find((kind) => kind.extensions?.includes(ext))
		if (byExt) return byExt
	}
	return unknownFileKind
}
