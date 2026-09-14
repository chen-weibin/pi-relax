
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

## 开发记录规范
1. 所有实现必须配套对应文档。
2. 记录方式：
   - 内容简短：直接写入当前文档；
   - 内容较多：在`docs/`目录新建文档存储，在当前文档标注引用文档路径、内容描述、查阅时机。
3. `docs/` 目录下的文档可相互引用：跨文档引用时使用相对路径（如 `[xxx 详情](../xxx.md)`），并在引用处注明被引用文档的内容描述与查阅时机，便于交叉查阅与维护。

## 文档索引

- [`docs/relax-agent.md`](docs/relax-agent.md) — MiniMax 包装层 `createAgent` 用法、支持的模型清单、dev 工作流与历史踩坑。查阅时机：在 `packages/agent/` 或 `app/server/` 下开发、调用 `createAgent`、调整 `dev:server` 编排时。
- [`docs/web.md`](docs/web.md) — `app/web` 的 Tailwind / 设计 token 接入、Cursor 风四区布局与组件职责。查阅时机：在 `app/web/` 下开发组件、调整三栏尺寸、修改设计 token 时。
- `app/agenttest/` — agent CLI 试验场，`pnpm dev` 订阅全部 `AgentSessionEvent` 打到终端，用于研究事件流。需要 `MINIMAX_API_KEY` env。查阅时机：调试 `session.subscribe` 行为、看 `message_update` 的 `partial` 累积、或临时跑单次 prompt 验证 agent 输出时。