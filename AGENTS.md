
## 目录约定
- `tmp/` — 项目本地临时文件&脚本；**不使用系统全局tmp目录**，目录已加入git忽略
- `script/` — 项目脚本
- `docs/` — 项目文档
- `test/` — 测试文件

## 编码原则
1. 组件保持模块化，遵循关注点分离。
2. 优先选用成熟、持续维护的开源库；无充分理由禁止重复造轮子。
3. 优先复用项目已有依赖能力，确认现有方案无法满足后，再引入新包或自研实现，禁止默认假定库不具备对应能力。

## 交互执行规则
4. 资料模糊、用户输入存在矛盾或冲突时，必须先提问确认，禁止直接执行。
5. 执行过程存在疑问应当及时提问，禁止主观假设。
6. 未经用户明确指示，禁止主动 `git commit` / `push` / 创建 PR / `git tag` 等写入远程的操作。所有改动留在工作区，等用户确认后再提交。
7. 每个项目的开发服务只启动一次，禁止同一服务再占一个新端口。需要跑服务时，先检查当前项目是否已在运行（看已有终端，或按该服务的固定端口查监听进程）。已在运行则直接复用，不要再执行启动命令。未运行时只给出对应命令（如 `pnpm dev:web`、`pnpm dev:server`），由用户手动启动，代理不得自行拉起。

## 开发记录规范
1. 所有实现必须配套对应文档。
2. 记录方式：
   - 内容简短：直接写入当前文档；
   - 内容较多：在`docs/`目录新建文档存储，在当前文档标注引用文档路径、内容描述、查阅时机。
3. `docs/` 目录下的文档可相互引用：跨文档引用时使用相对路径（如 `[xxx 详情](../xxx.md)`），并在引用处注明被引用文档的内容描述与查阅时机，便于交叉查阅与维护。

## 文档索引

- [`docs/web.md`](docs/web.md) — `app/web` 的 Tailwind / 设计 token 接入、Cursor 风四区布局、Composer 视觉规格。查阅时机：在 `app/web/` 下改 Tailwind 配置、调设计 token、改三栏尺寸、改 Composer / Setting / Sidebar 外壳时。原子组件的「何时用 / API / 视觉」在 [`docs/ui.md`](ui.md)。对话区渲染架构见 [`docs/web-conversation.md`](docs/web-conversation.md)。右侧扩展区插件、壳层 tab、FsApi/PtyApi 见 [`docs/web-extension.md`](docs/web-extension.md)。
- [`docs/web-conversation.md`](docs/web-conversation.md) — 对话区分层、`BlockSnapshot` 判别联合、runtime、滚动/打字机约定、mock 与真实事件边界、打磨 UI 改哪一层。查阅时机：改对话列表、块类型、贴底滚动、打字机、消息观感，或把 mock feed 换成 `AgentSessionEvent` 时。
- [`docs/ui.md`](docs/ui.md) — `app/web/src/ui/` 组件库的唯一详细文档。决策表、反例、每个组件的「何时用 / 何时不用 / API / 视觉 / 踩坑 / 查阅时机」全部在此。查阅时机：在 `app/web` 下新增 / 调用 UI 组件、为某需求选组件、判断「该不该自己写」、查阅组件完整 API 时。
- [`docs/web-extension.md`](docs/web-extension.md) — 右侧扩展区插件架构：编译期 registry、唯一一层壳层 tab、`reuseKey`、空态策略、FsApi / PtyApi 与 mock 边界。查阅时机：新增插件、改欢迎页 / tab 条、改关最后一 tab 是否收起、接真实文件系统或 PTY 时。
- [`docs/server.md`](docs/server.md) — `app/server` 的整体规划：`.relax` 数据根、能力剖面、性能上限、pi SDK 该用哪个入口、源码目录怎么拆。查阅时机：改服务端、定数据目录、接会话 / 文件同步 / 终端之前。对接 pi 时先看仓库里 `pi/packages/coding-agent` 的源码（运行时 `@earendil-works/pi-coding-agent@^1.0.4`），不要只凭该文档的摘要。改服务端行为时同步改这篇文档。已实现清单在 [`docs/server-implemented.md`](docs/server-implemented.md)。
- [`docs/server-implemented.md`](docs/server-implemented.md) — `app/server` 当前已经能用的功能，标题加编号列表。查阅时机：想看服务端现在做到哪、对照联调页时。改服务端行为时和 [`docs/server.md`](docs/server.md) 一起改。
- `app/agenttest/` — agent CLI 试验场，订阅 `AgentSessionEvent` 打到终端，用于研究事件流。需要 `MINIMAX_API_KEY` env。查阅时机：调试 `session.subscribe`、看 `message_update` 的 `text_delta`、或临时跑单次 prompt 验证 agent 输出时。