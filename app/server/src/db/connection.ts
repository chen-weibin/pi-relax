import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { getRelaxHome } from '../config/home.js'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  cwd TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER,
  created TEXT NOT NULL,
  modified TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_cwd ON projects(cwd);
CREATE UNIQUE INDEX IF NOT EXISTS projects_position_active ON projects(position) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS session_marks (
  id TEXT PRIMARY KEY,
  cwd TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);
`

let current: { path: string; db: DatabaseSync } | undefined

/** 按当前 home 打开 relax.sqlite。home 变了就关掉再开。 */
export function relaxDb(): DatabaseSync {
	const path = join(getRelaxHome(), 'sqlite', 'relax.sqlite')
	if (current?.path === path) return current.db
	current?.db.close()
	mkdirSync(join(getRelaxHome(), 'sqlite'), { recursive: true })
	const db = new DatabaseSync(path)
	db.exec('PRAGMA journal_mode = WAL')
	db.exec(SCHEMA)
	current = { path, db }
	return db
}

/** 关掉当前连接。测试换 home 前调用，避免占着临时目录里的文件。 */
export function closeRelaxDb(): void {
	current?.db.close()
	current = undefined
}
