import type { ComponentType } from 'react'
import {
	FileAgentsIcon,
	FileAudioIcon,
	FileCIcon,
	FileChangelogIcon,
	FileCppIcon,
	FileCssIcon,
	FileDockerIcon,
	FileEnvIcon,
	FileEslintIcon,
	FileFontIcon,
	FileGitIcon,
	FileGoIcon,
	FileGraphqlIcon,
	FileHIcon,
	FileHtmlIcon,
	FileImageIcon,
	FileJavaIcon,
	FileJsIcon,
	FileJsTestIcon,
	FileJsonIcon,
	FileLessIcon,
	FileLicenseIcon,
	FileLockIcon,
	FileMarkdownIcon,
	FilePackageJsonIcon,
	FilePdfIcon,
	FilePhpIcon,
	FilePrismaIcon,
	FilePythonIcon,
	FileReadmeIcon,
	FileRubyIcon,
	FileRustIcon,
	FileScssIcon,
	FileShellIcon,
	FileSqlIcon,
	FileSvgIcon,
	FileSvelteIcon,
	FileTomlIcon,
	FileTsIcon,
	FileTsTestIcon,
	FileTsxIcon,
	FileTsconfigIcon,
	FileTsxTestIcon,
	FileTxtIcon,
	FileUnknownIcon,
	FileVideoIcon,
	FileViteIcon,
	FileVueIcon,
	FileWasmIcon,
	FileXmlIcon,
	FileYamlIcon,
	FileZipIcon,
} from '../../../icons'
import { matchFileIcon, type FileIconAssociations } from '../../../icons/matchFileIcon'

export type FileViewerId = 'monaco'
export type FileOpen = 'text' | 'none'

export type FileKind = {
	id: string
	names?: string[]
	extensions?: string[]
	icon: ComponentType
	viewer: FileViewerId
	open: FileOpen
	language?: string
}

type FileKindInput = Omit<FileKind, 'open'> & { open?: FileOpen }

function withOpen(kind: FileKindInput): FileKind {
	return { ...kind, open: kind.open ?? 'text' }
}

export const unknownFileKind: FileKind = {
	id: 'unknown',
	icon: FileUnknownIcon,
	viewer: 'monaco',
	open: 'none',
	language: 'plaintext',
}

export const envFileKind: FileKind = {
	id: 'env',
	icon: FileEnvIcon,
	viewer: 'monaco',
	open: 'text',
	language: 'ini',
}

const fileKindInputs: FileKindInput[] = [
	{
		id: 'md',
		extensions: ['md', 'markdown'],
		icon: FileMarkdownIcon,
		viewer: 'monaco',
		language: 'markdown',
	},
	{
		id: 'readme',
		names: ['readme.md', 'readme'],
		icon: FileReadmeIcon,
		viewer: 'monaco',
		language: 'markdown',
	},
	{
		id: 'changelog',
		names: ['changelog.md', 'changelog'],
		icon: FileChangelogIcon,
		viewer: 'monaco',
		language: 'markdown',
	},
	{
		id: 'license',
		names: ['license.md', 'license'],
		icon: FileLicenseIcon,
		viewer: 'monaco',
		language: 'markdown',
	},
	{
		id: 'agents',
		names: ['agents.md'],
		icon: FileAgentsIcon,
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
		id: 'test-js',
		extensions: ['spec.js', 'test.js'],
		icon: FileJsTestIcon,
		viewer: 'monaco',
		language: 'javascript',
	},
	{
		id: 'js',
		extensions: ['js', 'mjs', 'cjs'],
		icon: FileJsIcon,
		viewer: 'monaco',
		language: 'javascript',
	},
	{
		id: 'test-ts',
		extensions: ['spec.ts', 'test.ts'],
		icon: FileTsTestIcon,
		viewer: 'monaco',
		language: 'typescript',
	},
	{
		id: 'ts',
		extensions: ['ts'],
		icon: FileTsIcon,
		viewer: 'monaco',
		language: 'typescript',
	},
	{
		id: 'test-tsx',
		extensions: ['spec.tsx', 'test.tsx'],
		icon: FileTsxTestIcon,
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
		id: 'test-jsx',
		extensions: ['spec.jsx', 'test.jsx'],
		icon: FileTsxTestIcon,
		viewer: 'monaco',
		language: 'javascript',
	},
	{
		id: 'jsx',
		extensions: ['jsx'],
		icon: FileTsxIcon,
		viewer: 'monaco',
		language: 'javascript',
	},
	{
		id: 'vite-ts',
		names: ['vite.config.ts', 'vite.config.mts'],
		icon: FileViteIcon,
		viewer: 'monaco',
		language: 'typescript',
	},
	{
		id: 'vite-js',
		names: ['vite.config.js', 'vite.config.mjs', 'vite.config.cjs'],
		icon: FileViteIcon,
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
		id: 'scss',
		extensions: ['scss', 'sass'],
		icon: FileScssIcon,
		viewer: 'monaco',
		language: 'scss',
	},
	{
		id: 'less',
		extensions: ['less'],
		icon: FileLessIcon,
		viewer: 'monaco',
		language: 'less',
	},
	{
		id: 'html',
		extensions: ['html', 'htm'],
		icon: FileHtmlIcon,
		viewer: 'monaco',
		language: 'html',
	},
	{
		id: 'xml',
		extensions: ['xml'],
		icon: FileXmlIcon,
		viewer: 'monaco',
		language: 'xml',
	},
	{
		id: 'vue',
		extensions: ['vue'],
		icon: FileVueIcon,
		viewer: 'monaco',
		language: 'html',
	},
	{
		id: 'svelte',
		extensions: ['svelte'],
		icon: FileSvelteIcon,
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
		id: 'lock',
		names: ['yarn.lock', 'pnpm-lock.yaml', 'package-lock.json'],
		icon: FileLockIcon,
		viewer: 'monaco',
		language: 'plaintext',
	},
	{
		id: 'tsconfig',
		names: ['tsconfig.json'],
		icon: FileTsconfigIcon,
		viewer: 'monaco',
		language: 'json',
	},
	{
		id: 'eslint-js',
		names: ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs'],
		extensions: ['eslintrc.js', 'eslintrc.cjs', 'eslintrc.mjs'],
		icon: FileEslintIcon,
		viewer: 'monaco',
		language: 'javascript',
	},
	{
		id: 'eslint-ts',
		names: ['eslint.config.ts', 'eslint.config.mts'],
		icon: FileEslintIcon,
		viewer: 'monaco',
		language: 'typescript',
	},
	{
		id: 'eslint-json',
		extensions: ['eslintrc.json'],
		icon: FileEslintIcon,
		viewer: 'monaco',
		language: 'json',
	},
	{
		id: 'eslint-yaml',
		extensions: ['eslintrc.yml', 'eslintrc.yaml'],
		icon: FileEslintIcon,
		viewer: 'monaco',
		language: 'yaml',
	},
	{
		id: 'eslintrc',
		extensions: ['eslintrc'],
		icon: FileEslintIcon,
		viewer: 'monaco',
		language: 'json',
	},
	{
		id: 'eslintignore',
		extensions: ['eslintignore'],
		icon: FileEslintIcon,
		viewer: 'monaco',
		language: 'plaintext',
	},
	{
		id: 'json',
		extensions: ['json'],
		icon: FileJsonIcon,
		viewer: 'monaco',
		language: 'json',
	},
	{
		id: 'yaml',
		extensions: ['yml', 'yaml'],
		icon: FileYamlIcon,
		viewer: 'monaco',
		language: 'yaml',
	},
	{
		id: 'toml',
		extensions: ['toml'],
		icon: FileTomlIcon,
		viewer: 'monaco',
		language: 'ini',
	},
	{
		id: 'svg',
		extensions: ['svg'],
		icon: FileSvgIcon,
		viewer: 'monaco',
		open: 'text',
		language: 'plaintext',
	},
	{
		id: 'image',
		extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'avif'],
		icon: FileImageIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'shell',
		extensions: ['sh', 'bash', 'zsh'],
		icon: FileShellIcon,
		viewer: 'monaco',
		language: 'shell',
	},
	{
		id: 'python',
		extensions: ['py'],
		icon: FilePythonIcon,
		viewer: 'monaco',
		language: 'python',
	},
	{
		id: 'go',
		extensions: ['go'],
		icon: FileGoIcon,
		viewer: 'monaco',
		language: 'go',
	},
	{
		id: 'rust',
		extensions: ['rs'],
		icon: FileRustIcon,
		viewer: 'monaco',
		language: 'rust',
	},
	{
		id: 'php',
		extensions: ['php'],
		icon: FilePhpIcon,
		viewer: 'monaco',
		language: 'php',
	},
	{
		id: 'java',
		extensions: ['java'],
		icon: FileJavaIcon,
		viewer: 'monaco',
		language: 'java',
	},
	{
		id: 'h',
		extensions: ['h'],
		icon: FileHIcon,
		viewer: 'monaco',
		language: 'c',
	},
	{
		id: 'c',
		extensions: ['c'],
		icon: FileCIcon,
		viewer: 'monaco',
		language: 'c',
	},
	{
		id: 'cpp',
		extensions: ['cpp', 'cc', 'hpp', 'hh'],
		icon: FileCppIcon,
		viewer: 'monaco',
		language: 'cpp',
	},
	{
		id: 'ruby',
		extensions: ['rb'],
		icon: FileRubyIcon,
		viewer: 'monaco',
		language: 'ruby',
	},
	{
		id: 'sql',
		extensions: ['sql'],
		icon: FileSqlIcon,
		viewer: 'monaco',
		language: 'sql',
	},
	{
		id: 'graphql',
		extensions: ['graphql', 'gql'],
		icon: FileGraphqlIcon,
		viewer: 'monaco',
		language: 'graphql',
	},
	{
		id: 'prisma',
		extensions: ['prisma'],
		icon: FilePrismaIcon,
		viewer: 'monaco',
		language: 'plaintext',
	},
	{
		id: 'wasm',
		extensions: ['wasm'],
		icon: FileWasmIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'pdf',
		extensions: ['pdf'],
		icon: FilePdfIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'zip',
		extensions: ['zip', 'gz', 'tgz'],
		icon: FileZipIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'font',
		extensions: ['woff', 'woff2', 'ttf', 'otf'],
		icon: FileFontIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'video',
		extensions: ['mp4', 'webm', 'mov'],
		icon: FileVideoIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'audio',
		extensions: ['mp3', 'wav', 'ogg'],
		icon: FileAudioIcon,
		viewer: 'monaco',
		open: 'none',
		language: 'plaintext',
	},
	{
		id: 'git',
		extensions: ['gitignore', 'gitattributes', 'gitmodules', 'gitkeep'],
		icon: FileGitIcon,
		viewer: 'monaco',
		language: 'plaintext',
	},
	{
		id: 'dockerfile',
		names: ['dockerfile'],
		icon: FileDockerIcon,
		viewer: 'monaco',
		language: 'dockerfile',
	},
	{
		id: 'docker-compose',
		names: ['docker-compose.yml', 'docker-compose.yaml'],
		icon: FileDockerIcon,
		viewer: 'monaco',
		language: 'yaml',
	},
	{
		id: 'dockerignore',
		extensions: ['dockerignore'],
		icon: FileDockerIcon,
		viewer: 'monaco',
		language: 'plaintext',
	},
]

export const fileKinds: FileKind[] = fileKindInputs.map(withOpen)

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
	const name = path.split(/[/\\]/).filter(Boolean).pop()?.toLowerCase() ?? ''
	if (name === '.env' || name.startsWith('.env.')) return envFileKind
	return matchFileIcon(path, fileIconAssociations) ?? unknownFileKind
}
