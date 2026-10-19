import { FileTsxIcon } from '../../../icons'
import { matchFileIcon } from '../../../icons/matchFileIcon'
import { resolveFileKind } from './fileKinds'

function assert(condition: boolean, message: string) {
	if (!condition) throw new Error(message)
}

const sample = {
	fileNames: { 'package.json': 'package-json', 'src/win.ini': 'scoped-name' },
	fileExtensions: { 'spec.ts': 'spec-ts', ts: 'ts', 'tar.gz': 'tar-gz', 'src/ts': 'scoped-ts' },
	languageIds: { json: 'json', ignore: 'git' },
	folderNames: { components: 'components', 'src/components': 'scoped-folder' },
	file: 'file',
	folder: 'folder',
}

assert(matchFileIcon('app/package.json', sample) === 'package-json', 'file name beats extension')
assert(matchFileIcon('src/win.ini', sample) === 'scoped-name', 'parent file name')
assert(matchFileIcon('src/foo.spec.ts', sample) === 'spec-ts', 'longest extension')
assert(matchFileIcon('lib/foo.ts', sample) === 'ts', 'short extension')
assert(matchFileIcon('src/foo.ts', sample) === 'scoped-ts', 'parent extension beats plain')
assert(matchFileIcon('a/archive.tar.gz', sample) === 'tar-gz', 'compound extension')
assert(matchFileIcon('.gitignore', sample, { languageId: 'ignore' }) === 'git', 'dotfile language')
assert(matchFileIcon('data.jsonc', sample, { languageId: 'jsonc' }) === 'json', 'jsonc uses json')
assert(matchFileIcon('notes.zzz', sample) === 'file', 'default file')
assert(matchFileIcon('src/components', sample, { kind: 'folder' }) === 'scoped-folder', 'parent folder')
assert(matchFileIcon('app/components', sample, { kind: 'folder' }) === 'components', 'folder name')
assert(matchFileIcon('app/other', sample, { kind: 'folder' }) === 'folder', 'default folder')

const pkg = resolveFileKind('app/package.json')
const json = resolveFileKind('app/other.json')
assert(pkg.id === 'package-json' && pkg.icon !== json.icon, 'package.json before json')

const tsx = resolveFileKind('src/foo.tsx')
const jsx = resolveFileKind('src/foo.jsx')
assert(tsx.icon === FileTsxIcon && jsx.icon === FileTsxIcon, 'tsx and jsx share icon')
assert(tsx.language === 'typescript' && jsx.language === 'javascript', 'monaco languages')

assert(resolveFileKind('src/foo.spec.ts').id === 'ts', 'spec.ts falls through to ts')
assert(resolveFileKind('.gitignore').id === 'unknown', 'gitignore uses fallback')
assert(resolveFileKind('foo.zzz').id === 'unknown', 'unknown extension')

console.log('file icon match ok')
