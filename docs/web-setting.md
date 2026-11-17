# Web Setting 规划

查阅时机：改 `app/web` 全屏设置页的信息架构、接 `/api/settings` / `/api/profile` / 模型与提供商 API，或拆掉现有四类侧栏占位导航时。外壳与挂载方式见 [web.md](web.md)「持久化 / Setting」；行内控件见 [ui.md](ui.md) 的 `SettingGroup` / `SettingRow`。

## 目标与非目标

### 目标

- 在 `settingOpen` 全屏层内提供**可逐块落地**的设置体验：先通基础模块，用到再补。
- **去掉**侧栏里「通用+外观」与「模型+代理」的两层**成组** UI（原 `GROUPS` 嵌套），改为四个**平级**导航项；主区仍按 `activeKey` **切换**单类内容，不做一页滚完四段。
- 设置内**纯前端搜索**：按关键词过滤可见行，不请求服务端。
- 模块范围（本期规划）：
  1. **通用 / 用户展示**：用户名与头像（内置 `Avatar` 或上传图），服务端 `/api/profile*` 持久化，供 `UserBar` 等展示；无账号体系。
  2. **外观**：主题用 `ThemeSelector` 迷你预览卡片；暗色为当前选中，**亮色禁用**并提示「当前暂未实现」，不切换 `data-theme`。
  3. **模型**：展示并配置内置提供商 key、自定义提供商、已配置状态；全局默认模型与 Composer **同一数据源**。
  4. **代理**（对话全局策略）：对话中发送、followUp 出队、停止时队列怎么处理、会话/项目删除方式，对接 `GET/PATCH /api/settings`。

### 非目标（本期不写进实现范围）

- 复杂鉴权、多用户、OAuth、真实账号同步。
- 主题切换（含亮色）、i18n、Langfuse、工具开关、temperature 等生成参数。
- 项目级 `.pi/settings.json` 编辑。网页停止只读全局 `abortQueue`。`abortPolicy` 仍留在文件里，设置页不展示。
- 设置搜索的服务端索引或 URL 深链。
- 侧栏「自定义」视图 `CustomizeView` 的实质内容（仍占位；模型配置集中在 Setting「模型」区块）。

### 后续可补（一笔带过）

temperature、按工具开关、观测（Langfuse）、语言包、OAuth 登录、项目级 settings 子页、appearance 亮色主题实装、与 `CustomizeView` 的职责拆分若产品需要再定。

---

## 现状与迁移方向

| 现状 | 规划 |
|------|------|
| ~~`Setting.tsx`：侧栏 `GROUPS` 两段捆包四类入口~~ **（S0 已做）** 侧栏 250px：**返回** + 四项平级按钮（通用 / 外观 / 模型 / 代理）+ 底部 `UserBar`；主区标题为当前类名，仅渲染该类占位演示 | 侧栏补 `SearchInput`（S1）；其余模块按 checklist 逐步替换占位 |
| `UserBar.tsx`：读 `useProfileStore`（`/api/profile`） | 已接；改 Setting「通用」与侧栏同源 |
| 模型：Composer 已接 `modelPicker` + `../api/models`；Setting「模型」已接默认模型、内置 key、自定义提供商 | 与 Composer 共用 `putDefaultModel` / `startModelList()`，不另建默认模型 store |
| 代理：Setting 已接对话中发送、出队、停止、删除 | 搜索关键词留到 S1 / S8 |

---

## 信息架构（侧栏平级导航）

### 页面骨架

沿用 [web.md](web.md)：`Workspace` 内 `{settingOpen && <Setting />}`，全屏 `z-50`。

```
┌─────────────────────────────────────────────────────────────┐
│ aside ~250px          │ main（flex-1 overflow-y-auto）       │
│ · 返回（toggleSetting）│ · max-w-[700px] 居中                  │
│ · 通用 / 外观 / 模型 / 代理（平级 nav，无两段 grouping）      │
│ · SearchInput（S1 再补）│ · 标题 = 当前类 label               │
│ · UserBar（贴底）     │ · 仅当前类的 SettingGroup 占位/表单   │
└─────────────────────────────────────────────────────────────┘
```

- 用扁平 `CATEGORIES`（或同等常量）+ `activeKey` 切换主区；**不要**恢复 `GROUPS` 双段容器把两项捆在一起。
- 主区内仍用 `SettingGroup` + 可选 `title`；占位间距 `gap-6` 与现实现一致。
- S1 起：搜索框在 aside 顶部；过滤作用于**当前类**主区各行（见下）。

### 模块顺序（侧栏自上而下）

1. **通用** — 用户名、头像。
2. **外观** — `ThemeSelector`（暗色选中 + 亮色禁用提示）。
3. **模型** — 默认模型、内置提供商、自定义提供商列表/入口。
4. **代理** — 对话中发送、出队、停止、删除。

侧栏顺序固定；点击切换主区，不是主区纵向堆叠四段。

### 搜索如何过滤

- 每个可搜行在实现时注册**稳定元数据**（建议同文件内 `const SETTING_SEARCH_INDEX: { id; section; label; keywords? }[]`，渲染时由 map 生成行，避免文案与索引两套）。
- 用户输入经 trim + 小写后，匹配行的 `label`、`description`、区块 `title`、可选 `keywords`（如 `followUpMode` →「出队」「一次一条」）。
- **不匹配的行隐藏**；某 `SettingGroup` 内全无匹配则整组隐藏；某区块全无匹配则该区块标题一并隐藏。
- 空结果：主区显示一行提示「没有匹配的设置」。
- 不实现：高亮匹配子串、键盘在结果间跳转、搜索历史。

---

## 各模块说明

### 1. 通用（用户展示）

**做什么**

- 编辑**显示名**（1–64，失焦 / Enter 提交）。
- 编辑**头像**：
  - **内置**：项目 `Avatar` 组件；可配形状、颜色（`ColorSwatch`）、表情；**不配**展示大小。
  - **自定义**：本地上传 PNG / JPEG / WebP（≤ 2 MiB）；可换图或「恢复内置」。
- Setting 与侧栏 `UserBar` 同源展示。

**不做什么**

- 登录、token、多用户鉴权。
- 粘贴外链头像 URL；把 profile 写进 `localStorage` 或 `/api/settings`。

**数据**

- 服务端 `GET/PATCH /api/profile`、`PUT/GET/DELETE /api/profile/avatar`（见 [server-implemented.md](server-implemented.md) §用户展示）。
- 前端：[`app/web/src/api/profile.ts`](../app/web/src/api/profile.ts) + [`store/profile.ts`](../app/web/src/store/profile.ts) 内存态；**不**扩展 `LocalDocument`。

**实现要点**

- `General.tsx`：无「用户」标题——首卡左头像（无方底）+ 紧挨用户名（默认无边框，双击进 `Input` 编辑，失焦 / Enter 保存）；次卡标题「头像设置」，首行 `Segmented variant="surface"` 内置/图片，选「图片」时上传按钮在分段控件右侧；内置时形状 → 颜色 → 表情各一行（形状/表情同样 `variant="surface"`，颜色 `ColorSwatch` 默认 7 色 + 自定义）。
- `UserBar.tsx` 订阅 `useProfileStore`：generated → `<Avatar size={28}>`，custom → 圆形 `<img>`。

**建议顺序**：S2（依赖服务端 profile API）。

---

### 2. 外观（ThemeSelector，亮色禁用）

**做什么**

- 展示当前产品事实：**仅暗色主题生效**（应用始终暗色 token，见 [web.md](web.md)）。
- Setting「外观」用 [`ThemeSelector`](ui.md#themeselector)（RareUI 风格迷你应用预览卡片）选主题。

**不做什么**

- 亮色主题实装、`data-theme` 写入、CSS 变量切换、持久化主题偏好。

**UI 表现（必须按此实现）**

- 主题块**特殊处理**：不包 `SettingGroup` 灰底卡片。
- 顶行：label `主题` + description `在浅色、深色主题之间选择（当前仅支持暗色界面）`（括号内为临时提示，亮色实装后去掉）；不包灰底、无右侧独立提示。
- 下方居中 [`ThemeSelector`](ui.md#themeselector)；与描述间距略大（`gap-8`），两卡间距同组件默认 `gap-8`。
- 暗色：可选、受控 `value="dark"`、选中环。
- 亮色：预览用 light 草稿 hex；`disabled`，悬停 [`Tooltip`](ui.md#tooltip) 文案 **`当前暂未实现`**；不可点、键盘跳过。
- 不接 store；日后实装亮色再迁 `local.ts` 并写 `data-theme`。

**建议顺序**：与侧栏壳层同一批或紧随通用之后（纯静态 UI）。

---

### 3. 模型

**做什么**

- **全局默认模型**：展示当前默认；可改为 `GET /api/models` 返回列表中的项；保存走 **`PUT /api/models/default`**（与 Composer 改下拉全局默认相同语义，见 [server-implemented.md](server-implemented.md) §模型）。
- **内置提供商**：`GET /api/providers` 里 `kind: 'builtin'`，一个可搜索下拉选中后再填 / 更换 / 清除。提交 **`PUT /api/providers/:id`**，删除 key **`DELETE /api/providers/:id`**。响应不含明文 key，以「已配置 / 未配置」展示（字段是 `configured`）。
- **自定义提供商**：`GET /api/custom-providers`。已设密钥的出现在「已配置」；添加 / 编辑用 Modal，删除从同一行发起。对接 `POST/PUT/DELETE /api/custom-providers*`，字段与校验见 [server-custom-providers.md](server-custom-providers.md)。表单是 id / name / baseUrl / api / apiKey / models，不含 `headers` / `authHeader`。
- **目录刷新**（可选一行）：`POST /api/models/refresh`（白名单目录；自定义不参与）。
- **已配置状态**：以 providers + models 可用列表为准；无可用模型时与 Composer 一致展示「无可用模型」类文案。

**不做什么**

- 在 Setting 里维护**第二套**默认模型状态。
- 改**当前会话**绑定模型（仍由 Composer / `selectSessionModel` 与会话历史负责）；Setting 只动**全局默认**。
- 会话内 thinking level（Composer 已有）。

**数据与双源避免**

| 能力 | 数据源 | 前端入口 |
|------|--------|----------|
| 可选模型列表、当前全局默认 | `GET /api/models`（及 `getDefaultModel`） | 复用 [`app/web/src/api/models/`](../app/web/src/api/models/)、[`session/modelPicker.ts`](../app/web/src/session/modelPicker.ts) 的加载与 `putDefaultModel` |
| 提供商与 key | `GET/PUT/DELETE /api/providers` | [`app/web/src/api/providers.ts`](../app/web/src/api/providers.ts) |
| 自定义提供商 | `/api/custom-providers*` | [`app/web/src/api/custom-providers.ts`](../app/web/src/api/custom-providers.ts) |
| Composer 展示用模型 | `modelPicker` 内存态 | Setting 写成功后调用 **`startModelList()`**。有会话打开时 Composer 仍显示会话模型 |

**实现要点**

- 顺序：默认模型 → 已配置（内置在上、自定义在下，同一张分隔线卡片）→ 内置提供商（一个可搜索下拉，选中后再填 / 更换 / 清除 key）。自定义提供商不在这张卡片里重复列出。已配置里的内置「修改」只改 API Key；自定义「修改」打开编辑弹框，「移除」从这里发起。
- 默认模型行：`Select` 的 options 来自已拉取的 `listModels()`。
- 可用模型按 `listModels()` 的 `provider` 分组，不另请求。内置 key 不再逐行铺开。
- 自定义表单字段是 id / name / baseUrl / api / apiKey / models。不含 `headers` / `authHeader`。编辑时 apiKey 留空则不提交，服务端保留原值。「内置提供商」标题右侧是描边「刷新模型列表」（`POST /api/models/refresh`，一次更新白名单内全部内置目录，自定义不参与），后面紧跟实心按钮「自定义」（打开添加弹框）。失败收成一条提示，列出失败的提供商 id。写成功后 `startModelList()`，不走 `chooseModel`。

**建议顺序**：在 **`api/providers`、`api/custom-providers` 客户端**就绪后做；默认模型行可与 Composer 共用请求，放在内置 key 之前或之后均可。

---

### 4. 代理（对话全局设置）

**做什么**

对接 `app/server/src/config/settings.ts` 与 [`routes/settings.ts`](../app/server/src/routes/settings.ts)。设置页只露这几行：

| 字段 | 含义 | 可选值 |
|------|------|--------|
| `sendWhileBusy` | 生成中再发送 | `queue` / `interrupt` |
| `followUpMode` | followUp 出队 | `one-at-a-time` / `all` |
| `abortQueue` | 停止时队列 | `deliver` / `clear` |
| `sessionDelete` | 会话删除方式 | `logical` / `physical` |
| `projectDelete` | 项目删除方式 | `logical` / `physical` |

`steeringMode` 和 `abortPolicy` 仍在接口和文件里，设置页不展示。网页排队走 followUp，见 [web-app.md](web-app.md)「发送与中止」。

- 打开 Setting 时 **`GET /api/settings`** 填表；修改后 **`PATCH /api/settings`** 只传变更字段。
- 文案用中文标签，值传英文枚举（与 API 一致）。

**不做什么**

- 编辑工作区 `.pi/settings.json`。网页停止不读项目层 `abortPolicy`。
- 把 `steer` 暴露成设置项。

**数据**

- 仅服务端 `~/.relax/agent/settings.json`（路径随 `home`）。`sendWhileBusy` 与 `abortQueue` 写在 `relax` 下。前端不写入 `localStorage`。
- `PATCH` 成功后以响应体为准更新表单，并记下这份设置给对话发送用。失败用 `message.error`，这一行回到改之前的值。

缺文件时 `sendWhileBusy` 为 `queue`，`abortQueue` 为 `deliver`，`followUpMode` 为 `one-at-a-time`。

---

## 搜索行为（汇总）

- **范围**：仅当前 Setting 页已实现的行（随模块分期增加索引表项）。
- **时机**：输入即过滤（`SearchInput` 受控 value）。
- **大小写**：不区分。
- **侧栏**：搜索框保持在 aside 顶部；过滤作用于右侧主区全部区块。
- **状态**：关闭 Setting（`toggleSetting`）时可选择清空搜索词（推荐清空，避免下次打开仍被过滤）。

---

## 分步落地顺序（checklist）

按块开工，不必一次全上：

- [x] **S0 壳层**：侧栏去掉 `GROUPS` 两段成组，改为四项平级 nav + `activeKey` 切换主区；保留返回与 `UserBar`；搜索留 S1。
- [ ] **S1 搜索骨架**：`SETTING_SEARCH_INDEX` + 过滤逻辑 + 空态文案（可先绑占位行，后换真实行）。
- [x] **S2 通用 / 用户**：`/api/profile*` + `store/profile`；通用区块用户名与头像；`UserBar` 同源展示。
- [x] **S3 外观**：`ThemeSelector` 暗色选中 + 亮色 disabled + tooltip「当前暂未实现」。
- [x] **S4 API 代理**：`app/web/src/api/settings.ts`（get + patch）；代理页接对话中发送、出队、停止、删除。
- [x] **S5 模型 · 默认**：默认模型行 + `putDefaultModel` + 刷新 `modelPicker`。
- [x] **S6 模型 · 内置 key**：`api/providers` + 列表 UI + PUT/DELETE。
- [x] **S7 模型 · 自定义**：`api/custom-providers` + 列表与 Modal 表单（最小字段，不含 `headers` / `authHeader`）。
- [ ] **S8 收尾**：占位文件已随 S4 删除。为每行补全搜索 keywords；必要时在 [web.md](web.md) 增一句 Setting 结构指向本文。

---

## 关键文件与交叉引用

| 类型 | 路径 |
|------|------|
| 设置页壳 | [`app/web/src/components/Setting/`](../app/web/src/components/Setting/)（`index.tsx` 壳层；`General` / `Appearance` / `Models` / `Agents` 各一块） |
| 侧栏用户条 | [`app/web/src/components/UserBar.tsx`](../app/web/src/components/UserBar.tsx) |
| 显隐 | [`app/web/src/store/common.ts`](../app/web/src/store/common.ts)（`settingOpen` / `toggleSetting`） |
| 布局等本地持久化 | [`app/web/src/store/local.ts`](../app/web/src/store/local.ts)（不含 profile） |
| 用户展示 | [`app/web/src/api/profile.ts`](../app/web/src/api/profile.ts)、[`app/web/src/store/profile.ts`](../app/web/src/store/profile.ts)；服务端见 [server-implemented.md](server-implemented.md) §用户展示 |
| 模型（Composer 同源） | [`app/web/src/session/modelPicker.ts`](../app/web/src/session/modelPicker.ts)、[`app/web/src/api/models/`](../app/web/src/api/models/) |
| 服务端设置 | [`app/server/src/routes/settings.ts`](../app/server/src/routes/settings.ts)、[`app/server/src/config/settings.ts`](../app/server/src/config/settings.ts) |
| UI 行与组 | [`docs/ui.md`](ui.md) — `SettingGroup`、`SettingRow`、`ThemeSelector`、`SearchInput`、`Select`、`Switch` |
| 布局与挂载 | [`docs/web.md`](web.md) — Setting 全屏、localStorage 约定 |
| 提供商 / 模型 API | [`app/web/src/api/providers.ts`](../app/web/src/api/providers.ts)、[`app/web/src/api/custom-providers.ts`](../app/web/src/api/custom-providers.ts)；服务端见 [server-implemented.md](server-implemented.md)、[server-custom-providers.md](server-custom-providers.md) |

实现某一 checklist 项时，以本节对应文件为入口，改完若行为与 [server-implemented.md](server-implemented.md) 不一致再回写服务端文档（代理/模型通常已 dokumented，以前端为准即可）。