# Sidebar Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-of-Sidebar actions area with three entries (新对话 / 搜索 / 自定义), each with hover state, and selected state for 新对话 + 自定义 only.

**Architecture:** Pure presentational component (`SidebarActions`) that takes a list of `{key, icon, label, onClick}` items plus a controlled `activeKey`. Icons are self-drawn SVG components in `icons/`. Sidebar wires the array literal and passes `activeKey={null}` for now (parent wiring deferred).

**Tech Stack:** React 19, Tailwind v4 (tokens via `@theme inline`), `classnames` for conditional classes, lucide-style 16×16 SVG icons.

## Global Constraints

- **TypeScript strict** (project default). All new code must typecheck via `pnpm --filter web typecheck` (= `tsc --noEmit && tsc --noEmit -p tsconfig.node.json`).
- **`classnames` only** for conditional class composition — never template strings (`docs/web.md`).
- **Tailwind utilities** only — no inline `style={}`. Color tokens come from `@theme inline` in `src/index.css`; do not introduce new colors.
- **Icons in `src/icons/`**: 16×16 `viewBox`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="1.5"`. Color via outer `text-*`.
- **No new dependencies**. The project does not have a test framework; verification = `typecheck` + dev-server visual check.
- **Domain components live in `src/components/`** (per `docs/web.md` rule for `ui/`).
- **Frequent commits** — one commit per task. Conventional commits, lowercase, scope `web`.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `app/web/src/icons/index.tsx` | modify | Add `SendIcon`, `SearchIcon`, `SlidersHorizontalIcon` |
| `app/web/src/components/SidebarActions.tsx` | create | Presentational component, accepts items + activeKey |
| `app/web/src/components/Sidebar.tsx` | modify | Replace top placeholder with `<SidebarActions/>`; define 3-item array |

---

### Task 1: Add three icons to `icons/index.tsx`

**Files:**
- Modify: `app/web/src/icons/index.tsx`

**Why first:** The three icons are leaves — no project code depends on them yet, but they're the visual primitives the rest of the plan builds on. Adding them first lets each subsequent task reference concrete imports.

- [ ] **Step 1: Append the three icons after `PanelRightIcon`**

Open `app/web/src/icons/index.tsx`. Add the following three exports after `PanelRightIcon`, keeping the existing SVG root attributes exactly (`width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"`):

```tsx
export function SendIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		>
			<path d="M14.5 1.5 1.5 6.5l4.5 2 2 4.5 6.5-11.5Z" />
			<path d="m6 8.5 5-5" />
		</svg>
	)
}

export function SearchIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		>
			<circle cx="7" cy="7" r="4.5" />
			<line x1="10.5" y1="10.5" x2="14" y2="14" />
		</svg>
	)
}

export function SlidersHorizontalIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		>
			<line x1="2" y1="4" x2="14" y2="4" />
			<line x1="2" y1="8" x2="14" y2="8" />
			<line x1="2" y1="12" x2="14" y2="12" />
			<circle cx="5" cy="4" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="11" cy="8" r="1.5" fill="currentColor" stroke="none" />
			<circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	)
}
```

Notes:
- `SendIcon`: a paper-plane shape (matches the reference image's New Chat glyph).
- `SearchIcon`: classic magnifying glass.
- `SlidersHorizontalIcon`: three horizontal lines with knobs at varying positions. Knobs use `fill="currentColor" stroke="none"` so they read as solid dots inheriting outer `text-*` color.

- [ ] **Step 2: Typecheck**

Run from repo root:
```bash
pnpm --filter web typecheck
```
Expected: PASS, no diagnostics.

- [ ] **Step 3: Commit**

```bash
git add app/web/src/icons/index.tsx
git commit -m "feat(web): 新增 Send/Search/SlidersHorizontal 图标"
```

---

### Task 2: Create `SidebarActions` component

**Files:**
- Create: `app/web/src/components/SidebarActions.tsx`

**Why second:** Component is presentational and pure — easy to verify in isolation. Doing this before wiring `Sidebar` means the wiring task is just composition, not a code review of the visual logic.

**Interfaces:**
- Consumes: nothing from earlier tasks (component itself doesn't import icons — parent passes them in `items`).
- Produces: `<SidebarActions/>` accepts `{ activeKey: string | null; items: SidebarActionItem[] }`. Later tasks pass the icons from Task 1 via `items`.

- [ ] **Step 1: Create the file with the following contents**

```tsx
import type { ComponentType } from 'react'
import classNames from 'classnames'

export interface SidebarActionItem {
	key: string
	icon: ComponentType
	label: string
	onClick: () => void
}

export interface SidebarActionsProps {
	/**
	 * Controlled active key. Matches an item's `key` to render active styling.
	 * Parent convention: do NOT set this to the search item's key — search
	 * is hover-only and must never show selected state.
	 */
	activeKey: string | null
	items: SidebarActionItem[]
}

export function SidebarActions({ activeKey, items }: SidebarActionsProps) {
	return (
		<div className="flex flex-col gap-0.5 px-1 py-2">
			{items.map((item) => {
				const Icon = item.icon
				const isActive = item.key === activeKey
				return (
					<button
						key={item.key}
						type="button"
						onClick={item.onClick}
						className={classNames(
							'flex h-7 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-100',
							isActive
								? 'bg-surface-active text-fg'
								: 'text-fg-2 hover:bg-surface-hover hover:text-fg',
						)}
					>
						<Icon />
						<span className="text-sm">{item.label}</span>
					</button>
				)
			})}
		</div>
	)
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web typecheck
```
Expected: PASS.

- [ ] **Step 3: Smoke-render check (manual, in dev server)**

Run dev server (a separate shell):
```bash
pnpm dev:web
```
Open the app in browser. The new component is not yet mounted in `Sidebar` (Task 3 does that), so this step is just to confirm nothing existing broke. Expected: app loads as before; `Sidebar.tsx` still shows the old "sidebar" placeholder text and the "setting" bottom row.

If you want a stronger check before Task 3, temporarily mount `<SidebarActions/>` with a hardcoded `items` array inside `Sidebar.tsx`, eyeball it, then revert. Optional.

- [ ] **Step 4: Commit**

```bash
git add app/web/src/components/SidebarActions.tsx
git commit -m "feat(web): 新增 SidebarActions 组件(actions 列表 + 受控激活态)"
```

---

### Task 3: Wire `Sidebar` to render `SidebarActions`

**Files:**
- Modify: `app/web/src/components/Sidebar.tsx`

**Why last:** Final composition step. Depends on Task 1 (icons) and Task 2 (component).

**Interfaces:**
- Consumes: `<SidebarActions/>` from Task 2, `{ SendIcon, SearchIcon, SlidersHorizontalIcon }` from Task 1.

- [ ] **Step 1: Replace `Sidebar.tsx` contents**

Full file becomes:

```tsx
import {
	SidebarActions,
	type SidebarActionItem,
} from './SidebarActions'
import {
	SendIcon,
	SearchIcon,
	SlidersHorizontalIcon,
} from '../icons'

interface Props {
	onOpenSetting: () => void
	collapsed?: boolean
}

export function Sidebar({ onOpenSetting, collapsed = false }: Props) {
	if (collapsed) return null

	const actions: SidebarActionItem[] = [
		{ key: 'newChat', icon: SendIcon, label: '新对话', onClick: () => {} },
		{ key: 'search', icon: SearchIcon, label: '搜索', onClick: () => {} },
		{
			key: 'customize',
			icon: SlidersHorizontalIcon,
			label: '自定义',
			onClick: () => {},
		},
	]

	return (
		<aside className="flex h-full w-full flex-col border-r border-border bg-sidebar">
			<SidebarActions activeKey={null} items={actions} />
			<div className="mt-auto px-2 py-3">
				<div
					onClick={onOpenSetting}
					className="cursor-pointer rounded-md px-3 py-1.5 text-fg-2 hover:bg-surface-hover hover:text-fg"
				>
					setting
				</div>
			</div>
		</aside>
	)
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web typecheck
```
Expected: PASS.

- [ ] **Step 3: Visual verification in dev server**

```bash
pnpm dev:web
```

In the browser, confirm on the left Sidebar (top to bottom):

1. Three items render: 「新对话」「搜索」「自定义」, each with its icon to the left and label text.
2. None is active by default (`activeKey={null}`) — all show secondary text color (`text-fg-2`, grayish).
3. Hover any item → background becomes darker (`bg-surface-hover`), text becomes primary (`text-fg`).
4. Move mouse off → reverts.
5. No layout shift on hover (compare sidebar width/positions before and during hover).
6. Click each item → no console error. (Click handlers are no-ops for now; this just confirms wiring.)
7. Bottom 「setting」 row still works exactly as before — clicking opens the Setting overlay.
8. Light-theme smoke (only if you already have a theme switcher; otherwise skip): with `[data-theme="light"]` set in DevTools, the same hover/active colors should apply via the light tokens defined in `src/index.css`. (Component does not need any change — `@theme inline` already wires light values.)

- [ ] **Step 4: Commit**

```bash
git add app/web/src/components/Sidebar.tsx
git commit -m "feat(web): Sidebar 顶部接入 SidebarActions 区域"
```

---

## Self-Review Checklist (for plan author)

- [x] Every spec requirement maps to a task: 3 icons (Task 1), component with items+activeKey (Task 2), Sidebar wiring (Task 3).
- [x] No `TODO` / `TBD` / "implement later" placeholders.
- [x] All code blocks are complete and runnable as-is.
- [x] Type names match across tasks: `SidebarActionItem`, `SidebarActionsProps`, `activeKey`, `items` are consistent from Task 2's definition through Task 3's usage.
- [x] Commit messages follow repo convention (lowercase + scope `web`).
- [x] No new dependencies introduced (per AGENTS.md "禁止默认假定库不具备对应能力").
- [x] Each task ends with a testable deliverable + commit; reviewers can gate on each task independently.
- [x] Out-of-scope items (search dialog, keyboard handler, real active-state logic) explicitly excluded from tasks; spec's "Out of Scope" honored.