# `app/web` 全局状态管理(zustand + immer)

- **Date:** 2026-09-11
- **Status:** Approved
- **Scope:** `app/web` shell 控制状态(common store)

## Goal

把 `App.tsx` 中的 shell 控制状态(`settingOpen` / `sidebarOpen` / `extensionOpen` / `mainView`)从 `useState` 迁移到 zustand + immer 全局 store,顺手清掉随之而来的 prop drilling。后续组件级 useMemo 优化作为迁移完成后的审查动作,只报告,不盲加。

> **实现备注(2026-09-11):** 多字段订阅在执行期统一采用 `useShallow` 合并单次 selector(原 spec 仅列了单字段 selector),见下文"选择器约定"。其他设计无变动。

不动的:
- 面板宽度的持久化(`usePersistedPanelLayout`)— 已经自管 localStorage,迁移收益小、改造代价大(YAGNI)。
- `ProjectSection` 内部的 `projects` / `expandedIds` / `sectionExpanded` — 完全 self-contained,无跨组件共享需求(YAGNI)。
- `Setting.tsx` / `Popover.tsx` / `Sidebar.tsx` 内部 UI 状态(scrollbar hover / open)— UI-only。

## Dependencies

`app/web/package.json` 的 `dependencies` 新增:

| 包 | 版本 | 用途 |
|---|---|---|
| `zustand` | `^5.0.0` | 全局 store 容器 |
| `immer` | `^10.1.0` | zustand 的 immer middleware,让 `set(s => { s.x = ... })` 风格生效 |

不引入 zustand 的 `persist` middleware — 现有 toggle 状态不持久化,与 `docs/web.md` 中"折叠状态不持久化"的约定一致。

## File structure

新增目录 `app/web/src/store/`:

```
src/store/
├── index.ts          # 统一 re-export,对外只暴露这一个入口
└── common.ts         # common store(shell 状态)
```

每个 store 一个文件,等文件膨胀再考虑 `common/` 子目录拆分(YAGNI)。

## common store shape

### 状态字段

| 字段 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `settingOpen` | `boolean` | `false` | Setting 全屏覆盖层是否打开 |
| `sidebarOpen` | `boolean` | `true` | 外层 Group 中 Sidebar Panel 是否挂载 |
| `extensionOpen` | `boolean` | `false` | 内层 Group 中 Extension Panel 是否挂载 |
| `mainView` | `MainView` | `'conversation'` | MainContainer 当前渲染哪个 view |

### 类型定义

```ts
// src/store/common.ts
export type MainView = 'conversation' | 'customize'

interface CommonState {
  settingOpen: boolean
  sidebarOpen: boolean
  extensionOpen: boolean
  mainView: MainView
  // actions
  setSettingOpen: (open: boolean) => void
  toggleSetting: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setExtensionOpen: (open: boolean) => void
  toggleExtension: () => void
  setMainView: (view: MainView) => void
}
```

### 创建方式

```ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export const useCommonStore = create<CommonState>()(
  immer((set) => ({
    settingOpen: false,
    sidebarOpen: true,
    extensionOpen: false,
    mainView: 'conversation',
    setSettingOpen: (open) => set((s) => { s.settingOpen = open }),
    toggleSetting: () => set((s) => { s.settingOpen = !s.settingOpen }),
    setSidebarOpen: (open) => set((s) => { s.sidebarOpen = open }),
    toggleSidebar: () => set((s) => { s.sidebarOpen = !s.sidebarOpen }),
    setExtensionOpen: (open) => set((s) => { s.extensionOpen = open }),
    toggleExtension: () => set((s) => { s.extensionOpen = !s.extensionOpen }),
    setMainView: (view) => set((s) => { s.mainView = view }),
  })),
)
```

actions 都是稳定的引用(zustand 不会在每次 render 时重建),可以放心解构不挂 selector。

## 选择器约定(防止过度渲染)

组件订阅**切片**,不订阅整个 store。

**单字段**直接 selector:

```ts
const sidebarOpen = useCommonStore((s) => s.sidebarOpen)
```

**多字段**用 `useShallow` 合并成一次订阅,避免连续多次 `useCommonStore(...)` 调用:

```ts
import { useShallow } from 'zustand/react/shallow'

const { sidebarOpen, extensionOpen, toggleSidebar, toggleExtension } = useCommonStore(
  useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    extensionOpen: s.extensionOpen,
    toggleSidebar: s.toggleSidebar,
    toggleExtension: s.toggleExtension,
  })),
)
```

`useShallow` 工作机制:selector 每次返回新对象,`useShallow` 浅比较上一次返回对象的字段引用,全部相等时复用旧引用 → 不触发 re-render。actions 是稳定引用,放进选择器也不会触发渲染。

**禁止** `const { ... } = useCommonStore()`(无 selector) — 任何字段变化都触发当前组件重渲染。

## Files & 改动清单

### 新增

| 文件 | 内容 |
|---|---|
| `app/web/src/store/common.ts` | common store 实现 |
| `app/web/src/store/index.ts` | `export * from './common'` |

### 修改

| 文件 | 改动 |
|---|---|
| `app/web/package.json` | dependencies 加 `zustand` + `immer` |
| `app/web/src/App.tsx` | 删 4 个 `useState`;`MainView` 改为 `export type { MainView } from './store/common'`;所有字段从 `useCommonStore` 切片读取,actions 直接调;不再向 `Sidebar` / `MainContainer` / `Setting` 传任何业务 props |
| `app/web/src/components/Sidebar.tsx` | 删 `view` / `onSelectView` / `onOpenSetting` props;内部用 `useCommonStore` 读 `mainView`,actions 也直接取 |
| `app/web/src/components/MainContainer.tsx` | 删 `view` / `onToggleSidebar` / `onToggleExtension` / `sidebarOpen` / `extensionOpen` props;内部直接 `useCommonStore(s => s.mainView)` |
| `app/web/src/components/Conversation.tsx` | 删 `onToggleSidebar` / `onToggleExtension` / `sidebarOpen` / `extensionOpen` props;内部直接读 store |
| `app/web/src/components/Setting.tsx` | 删 `onClose` prop;内部 `useCommonStore` 调 `closeSetting` / `toggleSetting` |
| `app/web/src/components/UserBar.tsx` | 删 `onOpenSetting` prop;内部直接 `useCommonStore(s => s.toggleSetting)` |

### 不动

- `app/web/src/hooks/usePersistedPanelLayout.ts`(已经自管 localStorage)
- `ui/` 下所有组件(纯展示,无业务状态)
- `ProjectSection.tsx` / `ProjectItem.tsx` / `SessionItem.tsx` / `ProjectSectionHeader.tsx`(`ProjectSection` 自管理状态)
- `CustomizeView.tsx` / `Extension.tsx`(无状态)
- `docs/web.md`(本任务不在布局层,UI 规范无变动)— 实际执行时补充了"状态管理(store/)"章节,以及在"布局"目录树中加 `store/` 子目录;属于规范同步,不涉及设计变更

## 验证

- `cd app/web && npm run typecheck`
- dev server 手测:toggle sidebar / extension / setting 三处,切 conversation / customize 两个 view,确认:
  - 视觉表现与迁移前一致
  - toggle 按钮的 title 随状态更新
  - SidebarActions 的 active 高亮跟随 view 切换
- 切换后 reload 页面,确认状态重置回默认(`sidebarOpen=true`,其余 `false`,`mainView='conversation'`)

## Out of scope(YAGNI)

- 任何 zustand `persist` middleware(状态不持久化)
- 面板宽度迁入 store
- ProjectSection / Setting 的内部状态上提
- 自动按 selector 生成 hook(`useSidebarOpen()` 之类)— 等重复模式出现再抽

## 后续(useMemo 审查,迁移完成后执行,不盲加)

迁移完成后审查结论(2026-09-11):

1. **`usePersistedPanelLayout.ts:44-56`** — 已有 `useMemo`,✓ 不动。
2. **`Sidebar.tsx:46-71`** — `actions` 数组每次渲染重建,含 2 个新闭包。跳过 — `SidebarActions` 不是 memo 的,引用变化不影响实际渲染。memo 后才有意义,目前 3 项纯展示,加 `useMemo` 反而多一份 diff 成本。
3. **`ProjectSection.tsx:83-93`** — `handleFilter` / `handleAddProject` / `handleAddSession` 是函数声明,每次重建。跳过 — 子组件不是 memo 的,引用变化无副作用。改 `useCallback` 是装饰性改动。
4. **`Conversation.tsx` / `MainContainer.tsx`** — 无派生值,不适用。

**结论**:不需要 `useMemo`。Selector 切片订阅已把重渲染压到最低,剩余链路都是低频用户操作(toggle/click),非高频渲染压力源。当前体量下加 `React.memo` / `useMemo` 是装饰性复杂度,YAGNI。

**真正需要 useMemo 的时机**:接入真实数据后,大列表(项目/会话)的 filter/sort/group 派生计算 + 列表项用 `React.memo` 包了之后再加 `useMemo` / `useCallback` 才有意义。届时一并做。

## 变更影响

- `App.tsx` 变成"纯布局装配",不再持有任何业务状态。
- 子组件自取 store,prop 通道显著瘦身:`Sidebar` -3 props,`MainContainer` -5 props,`Conversation` -4 props,`Setting` -1 prop,`UserBar` -1 prop。
- 选择器切片订阅让"toggle 一处,其他无关组件不重渲染"。
