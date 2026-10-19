export type FileIconAssociations<T> = {
	fileNames?: Record<string, T>
	fileExtensions?: Record<string, T>
	languageIds?: Record<string, T>
	folderNames?: Record<string, T>
	file?: T
	folder?: T
}

export type FileIconMatchOptions = {
	kind?: 'file' | 'folder'
	languageId?: string
}

const loweredTables = new WeakMap<object, Map<string, unknown>>()

function lookup<T>(table: Record<string, T> | undefined, key: string): T | undefined {
	if (!table) return undefined
	let lowered = loweredTables.get(table)
	if (!lowered) {
		lowered = new Map()
		for (const name in table) lowered.set(name.toLowerCase(), table[name])
		loweredTables.set(table, lowered)
	}
	return lowered.get(key.toLowerCase()) as T | undefined
}

function baseAndParent(path: string) {
	const parts = path.split(/[/\\]/).filter(Boolean)
	const name = (parts.pop() ?? '').toLowerCase()
	const parent = (parts.pop() ?? '').toLowerCase()
	return { name, parent }
}

function extensionSuffixes(name: string) {
	const parts = name.split('.')
	const suffixes: string[] = []
	for (let i = 1; i < parts.length; i++) {
		const suffix = parts.slice(i).join('.')
		if (suffix) suffixes.push(suffix)
	}
	return suffixes
}

function matchFolder<T>(name: string, parent: string, associations: FileIconAssociations<T>) {
	if (parent) {
		const scoped = lookup(associations.folderNames, `${parent}/${name}`)
		if (scoped !== undefined) return scoped
	}
	const byName = lookup(associations.folderNames, name)
	if (byName !== undefined) return byName
	return associations.folder
}

function matchFile<T>(
	name: string,
	parent: string,
	associations: FileIconAssociations<T>,
	languageId?: string,
) {
	if (parent) {
		const scopedName = lookup(associations.fileNames, `${parent}/${name}`)
		if (scopedName !== undefined) return scopedName
	}
	const byName = lookup(associations.fileNames, name)
	if (byName !== undefined) return byName

	for (const suffix of extensionSuffixes(name)) {
		if (parent) {
			const scopedExt = lookup(associations.fileExtensions, `${parent}/${suffix}`)
			if (scopedExt !== undefined) return scopedExt
		}
		const byExt = lookup(associations.fileExtensions, suffix)
		if (byExt !== undefined) return byExt
	}

	if (languageId) {
		const byLang = lookup(associations.languageIds, languageId)
		if (byLang !== undefined) return byLang
		if (
			languageId.toLowerCase() === 'jsonc' &&
			lookup(associations.languageIds, 'jsonc') === undefined
		) {
			const json = lookup(associations.languageIds, 'json')
			if (json !== undefined) return json
		}
	}

	return associations.file
}

export function matchFileIcon<T>(
	path: string,
	associations: FileIconAssociations<T>,
	options?: FileIconMatchOptions,
): T | undefined {
	const { name, parent } = baseAndParent(path)
	if (options?.kind === 'folder') return matchFolder(name, parent, associations)
	return matchFile(name, parent, associations, options?.languageId)
}
