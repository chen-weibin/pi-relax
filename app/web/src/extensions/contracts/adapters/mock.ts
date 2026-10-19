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
		{
			name: 'README.md',
			kind: 'file',
			text: '# pi\n\n工作区 mock 文件。用 Markdown 在 Monaco 里打开。\n',
		},
		{
			name: 'notes.txt',
			kind: 'file',
			text: '纯文本笔记。\n第二行。\n',
		},
		{
			name: 'demo.js',
			kind: 'file',
			text: "export function greet(name) {\n\treturn `hello ${name}`\n}\n\nconsole.log(greet('pi'))\n",
		},
		{
			name: 'demo.ts',
			kind: 'file',
			text: "export function greet(name: string) {\n\treturn `hello ${name}`\n}\n",
		},
		{
			name: 'demo.tsx',
			kind: 'file',
			text: 'export function Demo() {\n\treturn <span>pi</span>\n}\n',
		},
		{
			name: 'styles.css',
			kind: 'file',
			text: ':root {\n\t--app: #171717;\n}\n\nbody {\n\tmargin: 0;\n\tbackground: var(--app);\n}\n',
		},
		{
			name: 'index.html',
			kind: 'file',
			text: '<!doctype html>\n<html lang="zh-CN">\n\t<head>\n\t\t<meta charset="utf-8" />\n\t\t<title>pi</title>\n\t</head>\n\t<body>\n\t\t<p>mock html</p>\n\t</body>\n</html>\n',
		},
		{ name: 'package.json', kind: 'file', text: '{ "name": "relax-root" }\n' },
		{
			name: 'data.json',
			kind: 'file',
			text: '{\n\t"name": "pi",\n\t"ok": true\n}\n',
		},
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
	{ name: 'README.md', path: 'pi/README.md', kind: 'file' },
	{ name: 'notes.txt', path: 'pi/notes.txt', kind: 'file' },
	{ name: 'demo.js', path: 'pi/demo.js', kind: 'file' },
	{ name: 'demo.ts', path: 'pi/demo.ts', kind: 'file' },
	{ name: 'demo.tsx', path: 'pi/demo.tsx', kind: 'file' },
	{ name: 'styles.css', path: 'pi/styles.css', kind: 'file' },
	{ name: 'index.html', path: 'pi/index.html', kind: 'file' },
	{ name: 'package.json', path: 'pi/package.json', kind: 'file' },
	{ name: 'data.json', path: 'pi/data.json', kind: 'file' },
	{ name: 'index.tsx', path: 'pi/app/web/src/ui/MarkdownView/index.tsx', kind: 'file' },
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

function echoPtyInput(data: string) {
	let out = ''
	for (let i = 0; i < data.length; i++) {
		const ch = data[i]
		if (ch === '\r') {
			if (data[i + 1] === '\n') i++
			out += '\r\n'
		} else if (ch === '\n') {
			out += '\r\n'
		} else if (ch === '\x7f' || ch === '\b') {
			out += '\b \b'
		} else {
			out += ch
		}
	}
	return out
}

export const mockPty: PtyApi = {
	async create(opts) {
		const id = opts?.id ?? crypto.randomUUID()
		if (!ptyListeners.has(id)) ptyListeners.set(id, new Set())
		return { id }
	},
	async write(id, data) {
		const set = ptyListeners.get(id)
		if (!set) throw new PtyError('NOT_FOUND', id)
		const echoed = echoPtyInput(data)
		if (!echoed) return
		for (const listener of set) listener(echoed)
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
