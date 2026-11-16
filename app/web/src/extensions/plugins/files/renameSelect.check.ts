import assert from 'node:assert/strict'
import { renameSelectEnd } from './renameSelect'

assert.equal(renameSelectEnd('foo.ts', 'file'), 3)
assert.equal(renameSelectEnd('foo.test.ts', 'file'), 8)
assert.equal(renameSelectEnd('.env.local', 'file'), 4)
assert.equal(renameSelectEnd('.gitignore', 'file'), 10)
assert.equal(renameSelectEnd('.env', 'file'), 4)
assert.equal(renameSelectEnd('README', 'file'), 6)
assert.equal(renameSelectEnd('src', 'dir'), 3)
assert.equal(renameSelectEnd('foo.ts', 'dir'), 6)

console.log('renameSelect.check.ts: ok')
