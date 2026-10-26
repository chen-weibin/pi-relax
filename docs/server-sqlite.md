# SQLite

查阅时机：改 `relax.sqlite` 的表、项目登记或会话索引时。会话正文不在这里，仍是 [server.md](server.md) 里的 JSONL。已经能调的接口在 [server-implemented.md](server-implemented.md)。

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
| `cwd` | 绝对路径，同一字符串只有一行。登记接口写入前做 `realpath`。新建会话补的一行用会话上的 cwd（`resolve` 之后），与 `sessions.cwd` 相同 |
| `name` | 显示名。登记时不传则用目录名 |
| `position` | 未删除时的序号。软删除置空 |
| `created` | 登记时间，ISO |
| `modified` | 最近一次改名、移动或恢复的时间，ISO |
| `deleted_at` | 软删除时间。空表示仍在列表里 |

## sessions

侧栏和列表用的摘要。一行一次会话。正文仍在 JSONL。点「新对话」但不发送，不建文件、也不建行。

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  cwd TEXT NOT NULL,
  path TEXT NOT NULL,
  name TEXT,
  created TEXT NOT NULL,
  modified TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT
);
CREATE INDEX sessions_cwd_active ON sessions(cwd) WHERE deleted_at IS NULL;
```

| 字段 | 含义 |
|---|---|
| `id` | 会话 id，与 JSONL 头相同 |
| `cwd` | 工作区绝对路径 |
| `path` | JSONL 绝对路径。文件还没写出时先记下将来的路径 |
| `name` | 列表标题。`NULL` 表示还没写过；空字符串是手动清空，之后不再用第一句话填回。读出来空字符串和 `NULL` 都是 `""`。旧库里这一列如果是 `NOT NULL`，打开时会改成可空 |
| `created` | 插入时写成文件头上的创建时间，ISO |
| `modified` | 最近一条用户消息的时间，ISO。插入时等于 `created`。助手回复和拉列表都不改 |
| `completed` | `1` 为已完成。没有单独的「未完成」行 |
| `deleted_at` | 逻辑删除时间。空表示仍在列表里。接口删除不删 JSONL |

第一次 `POST /api/sessions` 建出会话管理器时插入。用户消息写入 JSONL 之后，把 `modified` 改成这条消息自己的 `timestamp`；当时 `name` 仍是 `NULL` 就把这句文本写入 `name`。改名只改 `name`。

已有 JSONL 在第一次列表时补进表：`created` 用文件头，`modified` 用最后一条用户消息的时间，没有用户消息则等于 `created`。文件里已有标题就用标题，否则 `name` 用第一条用户消息。`session_marks` 里的完成状态抄到 `completed`。已经逻辑删过的 `id` 不会因为文件还在再插回来。

列表按行里的 `path` 看文件在不在。不在就把这行逻辑删，并从这次结果里拿掉。文件还在就不读内容、不改 `modified`。还没写出文件的热会话留着。

## session_marks

旧的完成标记。新的完成状态写在 `sessions.completed`。这张表只在补进行时读一次，不再写入。没有行不再表示未完成。

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
| `cwd` | 当初标完成时该会话的工作区 |
| `completed` | `1` 为已完成。只在把旧行补进 `sessions` 时读取 |
