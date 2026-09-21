import { FsError, type FsApi, type FsEntry, type FsKind } from '../fs'
import { PtyError, type PtyApi } from '../pty'

type MockNode = {
	name: string
	kind: FsKind
	children?: MockNode[]
	text?: string
}

const ROOT = 'pi'

const tree: MockNode = {
	name: ROOT,
	kind: 'dir',
	children: [
		{ name: '.agents', kind: 'dir', children: [] },
		{ name: '.git', kind: 'dir', children: [] },
		{ name: '.gitignore', kind: 'file', text: 'node_modules\n.tmp\n' },
		{ name: 'AGENTS.md', kind: 'file', text: '# Agents\n' },
		{
			name: 'app',
			kind: 'dir',
			children: [
				{ name: 'agenttest', kind: 'dir', children: [] },
				{ name: 'server', kind: 'dir', children: [] },
				{
					name: 'web',
					kind: 'dir',
					children: [
						{ name: 'dist', kind: 'dir', children: [] },
						{ name: 'node_modules', kind: 'dir', children: [] },
						{ name: 'public', kind: 'dir', children: [] },
						{
							name: 'src',
							kind: 'dir',
							children: [
								{
									name: 'components',
									kind: 'dir',
									children: [
										{
											name: 'CustomizeView.tsx',
											kind: 'file',
											text: 'export function CustomizeView() {\n\treturn null\n}\n',
										},
										{
											name: 'UserMessage.tsx',
											kind: 'file',
											text: 'export function UserMessage() {\n\treturn null\n}\n',
										},
										{
											name: 'ThinkingMessage.tsx',
											kind: 'file',
											text: 'export function ThinkingMessage() {\n\treturn null\n}\n',
										},
									],
								},
								{ name: 'conversation', kind: 'dir', children: [] },
								{ name: 'hooks', kind: 'dir', children: [] },
								{ name: 'icons', kind: 'dir', children: [] },
								{ name: 'mock', kind: 'dir', children: [] },
								{ name: 'store', kind: 'dir', children: [] },
								{ name: 'styles', kind: 'dir', children: [] },
								{
									name: 'ui',
									kind: 'dir',
									children: [
										{ name: 'Editor', kind: 'dir', children: [] },
										{
											name: 'MarkdownView',
											kind: 'dir',
											children: [
												{
													name: 'index.css',
													kind: 'file',
													text: '/* streamdown + plugins */\n.markdown-view {\n\tline-height: 1.6;\n}\n',
												},
												{
													name: 'index.tsx',
													kind: 'file',
													text: 'export function MarkdownView() {\n\treturn null\n}\n',
												},
											],
										},
										{ name: 'MessageSurface', kind: 'dir', children: [] },
										{
											name: 'DisclosureRow.tsx',
											kind: 'file',
											text: 'export function DisclosureRow() {\n\treturn null\n}\n',
										},
									],
								},
								{
									name: 'index.ts',
									kind: 'file',
									text: 'export {}\n',
								},
							],
						},
					],
				},
			],
		},
		{ name: 'docs', kind: 'dir', children: [] },
		{ name: 'package.json', kind: 'file', text: '{ "name": "relax-root" }\n' },
	],
}

function join(parent: string, name: string) {
	if (!parent) return name
	return `${parent}/${name}`
}

function findNode(path: string): { node: MockNode; path: string } | null {
	const parts = path.split('/').filter(Boolean)
	if (parts.length === 0) return null
	if (parts[0] !== ROOT) return null
	let node = tree
	let current = ROOT
	for (const part of parts.slice(1)) {
		const next = node.children?.find((child) => child.name === part)
		if (!next) return null
		node = next
		current = join(current, part)
	}
	return { node, path: current }
}

function toEntry(parent: string, node: MockNode): FsEntry {
	return {
		name: node.name,
		path: join(parent, node.name),
		kind: node.kind,
	}
}

export const mockRecents: FsEntry[] = [
	{ name: 'index.tsx', path: 'pi/app/web/src/ui/MarkdownView/index.tsx', kind: 'file' },
	{ name: 'index.css', path: 'pi/app/web/src/ui/MarkdownView/index.css', kind: 'file' },
	{ name: 'index.ts', path: 'pi/app/web/src/index.ts', kind: 'file' },
	{ name: 'ThinkingMessage.tsx', path: 'pi/app/web/src/components/ThinkingMessage.tsx', kind: 'file' },
	{ name: 'UserMessage.tsx', path: 'pi/app/web/src/components/UserMessage.tsx', kind: 'file' },
	{ name: 'CustomizeView.tsx', path: 'pi/app/web/src/components/CustomizeView.tsx', kind: 'file' },
]

export const mockFs: FsApi = {
	async list(path) {
		const found = findNode(path)
		if (!found) throw new FsError('NOT_FOUND', path)
		if (found.node.kind !== 'dir') throw new FsError('NOT_FOUND', path)
		return (found.node.children ?? []).map((child) => toEntry(found.path, child))
	},
	async stat(path) {
		const found = findNode(path)
		if (!found) throw new FsError('NOT_FOUND', path)
		const text = found.node.text ?? ''
		return {
			kind: found.node.kind,
			size: found.node.kind === 'file' ? text.length : 0,
			mtime: 0,
		}
	},
	async read(path) {
		const found = findNode(path)
		if (!found) throw new FsError('NOT_FOUND', path)
		if (found.node.kind !== 'file') throw new FsError('NOT_FOUND', path)
		return {
			text:
				found.node.text ??
				`// mock FsApi.read\n// path: ${path}\n// 后端接入后替换 mock 适配器\n`,
		}
	},
}

const ptyListeners = new Map<string, Set<(chunk: string) => void>>()

export const mockPty: PtyApi = {
	async create(opts) {
		const id = opts?.id ?? crypto.randomUUID()
		if (!ptyListeners.has(id)) ptyListeners.set(id, new Set())
		return { id }
	},
	async write(id, _data) {
		if (!ptyListeners.has(id)) throw new PtyError('NOT_FOUND', id)
	},
	async resize(_id, _cols, _rows) {},
	async dispose(id) {
		ptyListeners.delete(id)
	},
	subscribe(id, onData) {
		let set = ptyListeners.get(id)
		if (!set) {
			set = new Set()
			ptyListeners.set(id, set)
		}
		set.add(onData)
		onData('chen@host pi % ')
		return () => {
			set.delete(onData)
		}
	},
}

export const FS_ROOT = ROOT
