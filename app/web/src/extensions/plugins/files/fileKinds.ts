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
import { matchFileIcon, type FileIconAssociations } from '../../../icons/matchFileIcon'

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
		id: 'jsx',
		extensions: ['jsx'],
		icon: FileTsxIcon,
		viewer: 'monaco',
		language: 'javascript',
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

function fileKindAssociations(kinds: FileKind[]): FileIconAssociations<FileKind> {
	const fileNames: Record<string, FileKind> = {}
	const fileExtensions: Record<string, FileKind> = {}
	for (const kind of kinds) {
		for (const name of kind.names ?? []) fileNames[name.toLowerCase()] = kind
		for (const ext of kind.extensions ?? []) fileExtensions[ext.toLowerCase()] = kind
	}
	return { fileNames, fileExtensions, file: unknownFileKind }
}

const fileIconAssociations = fileKindAssociations(fileKinds)

export function resolveFileKind(path: string): FileKind {
	return matchFileIcon(path, fileIconAssociations) ?? unknownFileKind
}
