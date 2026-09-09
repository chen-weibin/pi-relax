# Nested Resizable Panels — `1 | (2 | 3)`

- **Date:** 2026-09-09
- **Status:** Approved
- **Scope:** `app/web` shell layout

## Goal

App shell 布局从扁平三栏改为两层嵌套 Group：

```
┌──────┬─────────────────────────────────────────────┐
│      │                                             │
│  1   │                  2  |  3                    │
│ Side │     Conversation  │  Extension              │
│ bar  │                   │                         │
│      │                   │                         │
└──────┴───────────────────┴─────────────────────────┘
       外层 Group id="app-shell"
                  └─ 内层 Group id="main-area"
```

- 拖 `1 | (2|3)` 的分隔条 → 只改 Sidebar 与右侧整体的宽度，Conversation/Extension 比例不变。
- 拖 `2 | 3` 的分隔条 → 只改 Conversation 与 Extension 的宽度，Sidebar 不动。
- 两个 Group 的 layout 各自持久化到 `localStorage`。
- Sidebar / Extension 收起按钮行为沿用：按钮按下时整块 Panel 从所属 Group 中移除（不是折叠到 0px）。

## Tree

```
<div.h-screen.w-screen>
  <Group id="app-shell" orientation="horizontal">      ← 外层
    {sidebarOpen && <Panel id="sidebar"/>}             ← optional
    {sidebarOpen && <Separator/>}                      ← optional
    <Panel id="main">                                  ← 永远存在
      <Group id="main-area" orientation="horizontal">  ← 内层
        <Panel id="conversation"/>
        {extensionOpen && <Separator/>}
        {extensionOpen && <Panel id="extension"/>}
      </Group>
    </Panel>
  </Group>
</div>
```

## Constraints

- `Panel id="main"` 是外层 Group 的 Panel，同时是内层 Group 的容器。库对 Panel 的默认 `display:flex` 让内层 Group 撑满 `main`。
- minSize：sidebar 200px、conversation 320px、extension 300px、main 630px（= 320 + 300 + 分隔条余量，确保内层能容纳两个 panel 各自的最小宽度）。
- maxSize：sidebar 400px（防止拖太宽挤掉对话区）。
- defaultSize：
  - sidebar 260px（绝对值，外层折叠后用百分比会算不准）
  - conversation 不设（library 自动分配剩余空间）
  - extension 540px + `groupResizeBehavior="preserve-pixel-size"`（外层 Group 整体宽度变化时优先保住 extension 的像素宽度）

## Persistence

- 复用 `usePersistedPanelLayout`，调用两次：
  - 外层：`groupId='app-shell'`, `panelIds=['sidebar', 'main']`
  - 内层：`groupId='main-area'`, `panelIds=['conversation', 'extension']`
- `STORAGE_PREFIX='app-shell:layout'` 不变；storage key 多出一个 `:main-area`。
- collapsed 状态继续挂在 `'app-shell'` key 下，逻辑不动。

## Files

| 文件 | 改动 |
|---|---|
| `app/web/src/App.tsx` | 拆两层 Group；`usePersistedPanelLayout` 调用两次 |
| `app/web/src/hooks/usePersistedPanelLayout.ts` | 不动（已支持多 groupId） |
| `app/web/src/ui/Resizable{Handle,Panel,PanelGroup}.tsx` | 不动 |
| `app/web/src/components/{Sidebar,Extension,Conversation}.tsx` | 不动 |
| `docs/web.md` | 更新"布局"小节：嵌套结构、尺寸、持久化键名 |

## Verification

- `pnpm --filter web typecheck`
- dev server 手测：拖两个分隔条分别验证隔离性；toggle 收起再展开看宽度是否还原；reload 看持久化是否各自生效。

## Out of scope (YAGNI)

- 键盘快捷键折叠。
- 双击分隔条重置以外的复杂手势。
- `Setting.tsx`、tailwind token、`classnames` 依赖。
