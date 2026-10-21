# SQLite

查阅时机：改 `relax.sqlite` 的表、项目登记或会话完成标记时。会话正文不在这里，仍是 [server.md](server.md) 里的 JSONL。已经能调的接口在 [server-implemented.md](server-implemented.md)。

库文件是 `{home}/sqlite/relax.sqlite`（默认 `~/.relax/sqlite/relax.sqlite`）。以后的表都进这个文件。`journal_mode` 为 WAL。基座只写 `{home}/agent/`，不读这个目录。

## projects

一条登记的工作区。`deleted_at` 有值表示已从列表拿掉，会话文件还在。`position` 只对未删除的行有值，从 1 递增，列表按它倒序，最大的在第一行。

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  cwd TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER,
  created TEXT NOT NULL,
  modified TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX projects_cwd ON projects(cwd);
CREATE UNIQUE INDEX projects_position_active ON projects(position) WHERE deleted_at IS NULL;
```

| 字段 | 含义 |
|---|---|
| `id` | `crypto.randomUUID()` |
| `cwd` | `realpath` 之后的绝对路径。同一路径只有一行 |
| `name` | 显示名。登记时不传则用目录名 |
| `position` | 未删除时的序号。软删除置空 |
| `created` | 登记时间，ISO |
| `modified` | 最近一次改名、移动或恢复的时间，ISO |
| `deleted_at` | 软删除时间。空表示仍在列表里 |

## session_marks

用户把某条会话标成完成。没有行就是未完成。不存标题、正文或时间；那些以 JSONL 为准。

```sql
CREATE TABLE session_marks (
  id TEXT PRIMARY KEY,
  cwd TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);
```

| 字段 | 含义 |
|---|---|
| `id` | 会话 id，与 JSONL 头里的 id 相同 |
| `cwd` | 标完成时该会话的工作区 |
| `completed` | `1` 为已完成。标回未完成时删掉这一行 |
