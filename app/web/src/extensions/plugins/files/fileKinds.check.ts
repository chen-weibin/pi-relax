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

assert(resolveFileKind('src/foo.spec.ts').id === 'test-ts', 'spec.ts beats ts')
assert(resolveFileKind('src/foo.ts').id === 'ts', 'plain ts stays ts')
assert(resolveFileKind('.gitignore').id === 'git', 'gitignore')
assert(resolveFileKind('foo.zzz').id === 'unknown', 'unknown extension')
assert(resolveFileKind('app/.env').id === 'env', 'dotenv file')
assert(resolveFileKind('app/.env.local').id === 'env', 'dotenv suffix')
assert(resolveFileKind('notes.env').id === 'unknown', 'env extension is not dotenv')
assert(resolveFileKind('vite.config.ts').id === 'vite-ts', 'vite config beats ts')
assert(resolveFileKind('demo.test.ts').id === 'test-ts', 'test.ts beats ts')
assert(resolveFileKind('docker-compose.yml').id === 'docker-compose', 'compose beats yaml')
assert(resolveFileKind('config.yaml').id === 'yaml', 'plain yaml')
assert(resolveFileKind('eslint.config.js').id === 'eslint-js', 'eslint config beats js')
assert(resolveFileKind('.eslintrc').id === 'eslintrc', 'eslintrc')
assert(resolveFileKind('.eslintignore').id === 'eslintignore', 'eslintignore')
assert(resolveFileKind('tsconfig.json').id === 'tsconfig', 'tsconfig beats json')
assert(resolveFileKind('tsconfig.json').icon !== resolveFileKind('.env').icon, 'tsconfig color differs from env')

assert(resolveFileKind('src/foo.tsx').open === 'text', 'tsx opens')
assert(resolveFileKind('icon.svg').open === 'text', 'svg is text')
assert(resolveFileKind('Dockerfile').open === 'text', 'dockerfile opens')
assert(resolveFileKind('README').open === 'text', 'readme opens')
assert(resolveFileKind('.gitignore').open === 'text', 'gitignore opens')
assert(resolveFileKind('app/.env').open === 'text', 'dotenv opens')
assert(resolveFileKind('photo.png').open === 'none', 'png stays closed')
assert(resolveFileKind('clip.mp4').open === 'none', 'video stays closed')
assert(resolveFileKind('Makefile').open === 'none', 'unlisted name stays closed')
assert(resolveFileKind('notes.docx').open === 'none', 'unlisted extension stays closed')

console.log('file icon match ok')
