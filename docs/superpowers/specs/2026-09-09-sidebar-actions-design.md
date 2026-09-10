# Sidebar Actions — Design

Date: 2026-09-09
Status: Approved (design), pending spec review

## Goal

Add a feature area at the top of the left Sidebar matching the Cursor-style reference image. The area holds three actions:

1. 新对话 (New Chat) — hover + active states
2. 搜索 (Search) — hover only (no active state; future search dialog handles activation)
3. 自定义 (Customize) — hover + active states

Chinese UI text. Component is isolated, business-owned, lives in `components/`.

## Out of Scope

- Search dialog implementation (later)
- Keyboard shortcut handler for search (only a hint was discussed; we have since removed the right-side hint entirely)
- Real active-state logic — `activeKey` is wired but passed as `null` in Sidebar; parent wiring is deferred

## Architecture

### File layout

```
app/web/src/
├── components/
│   ├── Sidebar.tsx            (edit: replace top placeholder with <SidebarActions/>)
│   └── SidebarActions.tsx     (new)
└── icons/
    └── index.tsx              (edit: add SendIcon / SearchIcon / SlidersHorizontalIcon)
```

`SidebarActions` is a **domain component** (Sidebar-specific), so it goes in `components/` rather than `ui/`. `ui/` is reserved for business-agnostic primitives reusable outside the app shell (per `docs/web.md`).

### Component shape

```ts
// app/web/src/components/SidebarActions.tsx
import type { ComponentType } from 'react'

export interface SidebarActionItem {
  key: string
  icon: ComponentType
  label: string
  onClick: () => void
}

export interface SidebarActionsProps {
  activeKey: string | null
  items: SidebarActionItem[]
}

export function SidebarActions({ activeKey, items }: SidebarActionsProps) {
  return (
      <div className="flex flex-col gap-0.5 px-1.5 py-2.5">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = item.key === activeKey
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={classNames(
              'flex h-[30px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-md transition-colors duration-100',
              isActive
                ? 'bg-surface-active text-fg'
                : 'text-fg-2 hover:bg-surface-hover hover:text-fg',
            )}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

Notes:

- `type="button"` prevents form submit if Sidebar is ever rendered inside a form.
- `classnames` is used for conditional classes (per `docs/web.md` rule; `classnames@^2.5.1` is already a dependency).
- Items render top-down in array order; parent controls order.

### Active semantics

- `activeKey` is **controlled** — parent owns the truth.
- "Search never shows active state" is enforced by **parent convention**: Sidebar (or any consumer) must never set `activeKey` to the search item's `key`. The component itself does not block this — it just renders the active style whenever `item.key === activeKey`. Doc this on the prop with a one-line comment.
- No internal toggle / no `useState` inside the component. Clicks always fire `onClick`; the consumer decides whether re-clicking the active item stays active, deselects, or no-ops.

### Icons

Added to `app/web/src/icons/index.tsx`, matching the existing `PanelLeftIcon` / `PanelRightIcon` convention (16×16, `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="1.5"`).

- `SendIcon` — paper plane / arrow used in the reference for "New Chat"
- `SearchIcon` — magnifying glass
- `SlidersHorizontalIcon` — semantic customize glyph (per user direction: pick semantically appropriate icon, no reference image for this slot)

### Integration in Sidebar

`Sidebar.tsx` becomes:

```tsx
import { SidebarActions, type SidebarActionItem } from './SidebarActions'
import { SendIcon, SearchIcon, SlidersHorizontalIcon } from '../icons'

interface Props {
  onOpenSetting: () => void
  collapsed?: boolean
}

export function Sidebar({ onOpenSetting, collapsed = false }: Props) {
  if (collapsed) return null

  const actions: SidebarActionItem[] = [
    { key: 'newChat', icon: SendIcon, label: '新对话', onClick: () => {} },
    { key: 'search', icon: SearchIcon, label: '搜索', onClick: () => {} },
    { key: 'customize', icon: SlidersHorizontalIcon, label: '自定义', onClick: () => {} },
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

The bottom `setting` row is untouched — it belongs to a different partition (preferences, not the new actions bar).

## Visual Spec

Reference: `docs/design-system.md` §6 (Sidebar), §7 (Sidebar Navigation), §8 (Sidebar Section), §36 (Motion).

| Property | Value | Source |
|---|---|---|
| Container background | `bg-sidebar` (transparent over it) | §6 |
| Item height | 30px (`h-[30px]`) | §7 — matches the spec range (30–34px) exactly |
| Item padding | `px-2.5 py-1.5` (10/6) | §7 (6–8px range) |
| Item radius | `rounded-md` (8px) | §7 says 6px; 8px matches existing IconButton hover (`rounded-md` in this codebase) |
| Icon-to-text gap | `gap-2.5` (10px) | breathing room so 14px icon doesn't crowd 13px text |
| Inter-item gap | `gap-0.5` (2px) | §8 says 2–4px; pick bottom of range for closer feel |
| Container padding | `px-1.5 py-2.5` (6/10) | gives items room to breathe inside the sidebar edge |
| Icon size | 14px (per user direction) | §33 |
| Default text | `text-fg-2` (#C7C7C7), `text-md` (13px) | §3.1 (body 13–14px), §7 |
| Hover background | `bg-surface-hover` (#292929) | §7 |
| Hover text | `text-fg-bright` (#F5F5F5) | §7 — new `--fg-bright` tier above `--fg`, introduced so hover/active text stays one step brighter than default after the default palette was raised |
| Active background | `bg-surface-active` (#2E2E2E) | §7 |
| Active text | `text-fg-bright` (#F5F5F5) | §7 |
| Cursor | `cursor-pointer` (explicit on `<button>`) | explicit because `<button>` styling can be overridden by future CSS resets |
| Transition | `transition-colors duration-100` | §36 |

## Validation

- `pnpm --filter web typecheck` must pass (from repo root). It expands to `tsc --noEmit && tsc --noEmit -p tsconfig.node.json`.
- Manual check in dev server (`pnpm dev:web`): hover each of the 3 items — background/text changes match the matrix; no flicker between hover/active; layout doesn't shift when active toggles.
- Manual check: passing `activeKey="newChat"` lights up only the new-chat item, not search or customize. Passing `activeKey="search"` lights up search (sanity check that the prop is honored — Sidebar itself does not pass this, but the prop contract should not silently drop it).
- Light theme smoke: confirm tokens resolve correctly (the component uses `bg-surface-hover` etc., all of which are wired through `@theme inline`, so light-theme values will apply when the switcher ships — no extra work here).

## Decisions Log

- **Approach B (items prop) chosen** over hardcoded entries: trade-off is one extra prop for future flexibility (e.g. adding/removing entries without touching the component). With only 3 stable top-level entries this is borderline, but the user preferred the configuration shape.
- **No right-side shortcut hint**: the `⌘K` badge from the reference is removed. Search entry has no trailing element at all.
- **`activeKey` as bare `string`, not a closed union**: keeps the API generic for `SidebarActionItem.key`. The "search is never active" rule is documented on the prop, enforced by parent convention, not by TS narrowing.
- **Customize icon = `SlidersHorizontalIcon`**: user confirmed semantic icon choice; no image reference for this slot.
- **`h-[30px]` (30px) vs earlier `h-7` (28px)**: initial draft used 28px to match the IconButton density; visual review pushed back ("偏小气") and the design system §7 explicitly calls for 30–34px. Bumped to 30px, font to `text-md` (13px), padding to `px-2.5 py-1.5` so each item feels substantial rather than petty.