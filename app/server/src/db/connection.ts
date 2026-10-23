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

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  cwd TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT,
  created TEXT NOT NULL,
  modified TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS sessions_cwd_active ON sessions(cwd) WHERE deleted_at IS NULL;
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
	allowUnsetSessionName(db)
	current = { path, db }
	return db
}

/**
 * 早先建出来的 sessions.name 是 NOT NULL。新建会话还没有标题，要写入 NULL。
 * CREATE TABLE IF NOT EXISTS 不会改已有的列，所以这里把旧列换成可空。
 */
function allowUnsetSessionName(db: DatabaseSync): void {
	const column = db
		.prepare(`SELECT "notnull" AS required FROM pragma_table_info('sessions') WHERE name = 'name'`)
		.get() as { required: number } | undefined
	if (!column || column.required === 0) return
	db.exec(`
		BEGIN;
		CREATE TABLE sessions_name_fix (
			id TEXT PRIMARY KEY,
			cwd TEXT NOT NULL,
			path TEXT NOT NULL,
			name TEXT,
			created TEXT NOT NULL,
			modified TEXT NOT NULL,
			completed INTEGER NOT NULL DEFAULT 0,
			deleted_at TEXT
		);
		INSERT INTO sessions_name_fix (id, cwd, path, name, created, modified, completed, deleted_at)
			SELECT id, cwd, path, name, created, modified, completed, deleted_at FROM sessions;
		DROP TABLE sessions;
		ALTER TABLE sessions_name_fix RENAME TO sessions;
		CREATE INDEX sessions_cwd_active ON sessions(cwd) WHERE deleted_at IS NULL;
		COMMIT;
	`)
}

/** 关掉当前连接。测试换 home 前调用，避免占着临时目录里的文件。 */
export function closeRelaxDb(): void {
	current?.db.close()
	current = undefined
}
