# ProgressBar — Design

Date: 2026-09-17
Status: Approved (design), pending implementation

## Goal

Encapsulate a horizontal **interactive slider** (drag/click on track, keyboard nav) with an optional value label. Drives the `设置项 5` row in Setting → 子分组 as a smoke test; reusable for any future "drag a percent / range" surface.

Reference image: Intensity slider — horizontal bar + circular thumb + `0%` label on the right (green-outlined in the image).

## Out of Scope

- Vertical orientation
- Multi-thumb / range selection (min & max handles)
- Color picker / hue wheel (the Hue control above Intensity in the reference image uses a different pattern; not part of this design)
- Tick marks / labeled scale
- Tooltip on drag (no need at this density)

## Architecture

### File layout

```
app/web/src/
└── ui/
    └── ProgressBar.tsx       (new, single file)
```

Plus wiring in `app/web/src/components/Setting.tsx` (replace `i === 4` placeholder).

`ProgressBar` lives in `ui/` because it is business-agnostic — takes a raw numeric value range, no domain references. Same category as `Switch` / `NumberStepper` / `SettingRow`.

### Component shape

```ts
// app/web/src/ui/ProgressBar.tsx
import type { ReactNode } from 'react'

export interface ProgressBarProps {
  /** Controlled value. When provided, internal state is ignored. */
  value?: number
  /** Uncontrolled initial value. Falls back to `min`. */
  defaultValue?: number
  /** Fired on every change (drag, click, keyboard). Receives clamped, stepped value. */
  onChange?: (value: number) => void

  /** Lower bound (inclusive). Default 0. */
  min?: number
  /** Upper bound (inclusive). Default 100. */
  max?: number
  /** Step granularity. Default 1. Round-to-step applied before clamping. */
  step?: number

  /** Disables interaction; visual opacity 0.5. */
  disabled?: boolean

  /** Whether to render the value slot. Default true. */
  showValue?: boolean
  /** Custom value render. Receives the current value and the computed percent (0–100). */
  renderValue?: (value: number, percent: number) => ReactNode
  /** Slot position relative to the track. Default 'after'. */
  valuePosition?: 'before' | 'after'

  /** Fill-mode: wrapper becomes `flex w-full` (block-level, fills parent). */
  block?: boolean
  /** Explicit wrapper width. `number` is interpreted as px; `string` is forwarded as-is (e.g. `'50%'`, `'10rem'`). Default wrapper width is `100px` when neither `block` nor `width` is set. */
  width?: number | string
  /** Whether to render the colored fill (bg-fg-3) inside the track up to the current value. Default true. When false, only the thumb indicates position; the track stays uniform bg-border-hover. */
  filled?: boolean

  /** aria-label on the slider element. Required when slot is hidden or unlabeled. */
  ariaLabel?: string
  /** Forwarded to the outer wrapper. */
  className?: string
}
```

Default `renderValue` is `(_, p) => \`${Math.round(p)}%\``.

### Value helpers (internal)

```ts
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const snap   = (n: number, lo: number, step: number) =>
  lo + Math.round((n - lo) / step) * step
const percent = (v: number, lo: number, hi: number) =>
  hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100
const valueFromPointer = (ratio: number, lo: number, hi: number, step: number) => {
  const raw = lo + ratio * (hi - lo)
  return clamp(snap(raw, lo, step), lo, hi)
}
```

All pure — no React state inside. `valueFromPointer` is the only "interesting" code path; covered by a small `__main__` self-check (see Validation).

### Behavior

- **Click on track** → set value at click ratio.
- **Pointer down on thumb + drag** → continuous update. Uses `setPointerCapture` so the drag survives leaving the track or moving fast.
- **Pointer down anywhere on the track** (including thumb) → start drag/click at that ratio. `pointermove` keeps updating; `pointerup` / `pointercancel` releases capture.
- **Keyboard** (on the focused slider `<div>` with `tabIndex={0}`):
  - `ArrowLeft` / `ArrowDown` → `-step`
  - `ArrowRight` / `ArrowUp` → `+step`
  - `Home` → `min`
  - `End` → `max`
  - `PageUp` / `PageDown` → ±`(max - min) / 10`
- **Controlled vs uncontrolled** mirrors `NumberStepper`:
  ```ts
  const isControlled = value !== undefined
  const current = isControlled ? value : internal
  ```
- **Disabled** → pointer/keyboard listeners return early; `tabIndex={-1}`; opacity 0.5 on the wrapper.
- **Out-of-range input** → clamped on every change before `onChange` fires; consumer always sees a value in `[min, max]` snapped to `step`.

### Render structure

```tsx
<span
  className={classNames(
    'inline-flex items-center gap-2 h-[26px]',
    disabled && 'opacity-50',
    className,
  )}
>
  {showValue && valuePosition === 'before' && valueSlot}
  <div
    ref={trackRef}
    role="slider"
    tabIndex={disabled ? -1 : 0}
    aria-label={ariaLabel}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={current}
    aria-disabled={disabled || undefined}
    onPointerDown={onPointerDown}
    onKeyDown={onKeyDown}
    className="relative flex h-3 flex-1 cursor-pointer items-center touch-none select-none"
  >
    <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-hover" />
    <div
      className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg-3"
      style={{ width: `${percent}%` }}
    />
    <div
      className="relative h-3 w-3 rounded-full bg-fg-3 shadow transition-colors hover:bg-fg-bright focus-visible:bg-fg-bright"
      style={{ left: `calc(${percent}% - 6px)` }}
    />
  </div>
  {showValue && valuePosition === 'after' && valueSlot}
</span>
```

Where `valueSlot` is:

```tsx
const valueSlot = (
  <span className="min-w-[3rem] text-right text-md tabular-nums text-fg-3">
    {renderValue ? renderValue(current, percent) : `${Math.round(percent)}%`}
  </span>
)
```

(`text-right` matches the reference image where `0%` sits flush against the right edge of the track.)

### Visual Spec

| Element | Value | Rationale |
|---|---|---|
| Outer height | `h-[26px]` | Matches `NumberStepper` / `Select` default — sits flush in `SettingRow` right slot |
| Outer layout | `inline-flex items-center gap-2` (default); `block` or `width` switches to `flex` + adds `w-full` / inline width; default wrapper width = `100px` | Slot · track · slot with 8px gap (larger than `gap-1` because the value slot has no `min-w` padding, so the gap is purely inter-element); track wide enough to drag comfortably even without explicit width |
| Track height | `h-1` (4px) | Reference image; thin enough to feel precise |
| Track bg | `bg-border-hover` (`#383838`) | Same shade as `SettingRow` container — low contrast |
| Fill bg | `bg-fg-3` (`#A1A1A1`) | Same shade as the reference's filled portion; **only rendered when `filled=true` (default)** — `filled=false` makes the track uniform, position conveyed by thumb only |
| Thumb size | `12×12` (`h-3 w-3`) | Reference image |
| Thumb bg | `bg-fg-2` (`#C7C7C7`) → hover/focus `bg-fg-bright` (`#F5F5F5`) | One step lighter than fill (`bg-fg-3`) so the thumb visually pops above the filled portion; hover/focus jumps to the brightest tier for clear interaction feedback |
| Thumb elevation | `shadow` (Tailwind default) | Lift above the track |
| Value slot | `text-right tabular-nums text-fg-2` | Mono digits, right-aligned, one step brighter than disabled-tier text; **no** `min-w` so the slot hugs content (the perceived gap before was `min-w-[3rem]` minus content width plus `gap-1`) |
| Disabled | `opacity-50` on outer wrapper | Whole component dims |
| Focus ring | none on the slot; the thumb itself lights up via `focus-visible` (browser default ring on the track) | Avoid extra ring noise |

> Per-instance color customization is **not** exposed (YAGNI). Customization flows through `className` on the outer wrapper + utility-class overrides on the children via `[&_.bg-fg-3]:bg-…` selectors when truly needed. This keeps the API surface small and aligned with how `Switch` / `NumberStepper` work.

## Wiring in `Setting.tsx`

```diff
+ const [progressVal, setProgressVal] = useState(0)
  …
  ) : i === 3 ? (
    <NumberStepper … />
+ ) : i === 4 ? (
+   <ProgressBar
+     value={progressVal}
+     onChange={setProgressVal}
+     width={130}
+     filled={false}
+     ariaLabel={label}
+   />
  ) : (
    <div className="h-7 min-w-[80px] rounded-md border border-border-hover bg-surface" />
  )}
```

`width={130}` gives the track ~130px (track + 4px gap + ~30px value slot ≈ 130 + 4 + 30 = 164px total wrapper). `block` alone wouldn't help here — `SettingRow`'s right slot is `shrink-0` content-sized, so `w-full` resolves to the wrapper's content width. For `block` to fill the row, the parent must provide an explicit width (e.g. a Modal or a full-width Drawer row).

## Docs sync

- [`docs/ui.md`](../../ui.md) — decision table adds `拖拽百分比/数值 → ProgressBar | 别写裸 <input type="range">`; anti-examples table adds a row forbidding per-instance color prop.
- [`docs/ui.md`](../../ui.md) — new component section `ProgressBar` (API + 行为 + 视觉 + 踩坑).
- [`docs/web.md`](../../web.md) — § UI 组件库 pointer table gets a new row.
- This spec is referenced from `app/web/AGENTS.md`/`README.md` only if a placeholder exists; otherwise nothing.

## Validation

1. `pnpm --filter web typecheck` — must pass.
2. Browser smoke (`pnpm dev:web` → Setting → 通用 → 子分组 → 设置项 5):
   - Drag thumb: value moves continuously, label updates (`%` tick changes by ≥1 each ~1% drag).
   - Click on track (left side, right side, middle): thumb jumps to clicked ratio; value label updates.
   - Tab to slider → arrow keys step ±1; `Home` → `0%`; `End` → `100%`; `PageUp`/`PageDown` → ±10.
   - Toggle value via react devtools to `<0` or `>100`: clamped to range.
   - `disabled` flag (manual test by adding `disabled` to one instance): no pointer response, opacity dimmed, tab skips it.
   - `showValue={false}`: slot disappears; track still interactive.
   - `valuePosition="before"`: label on the left of the track.
   - Custom `renderValue`: e.g. `renderValue={(v) => <span data-testid="raw">{v}</span>}` renders a node with `data-testid="raw"`.
3. `__main__` self-check in `ProgressBar.tsx`:
   ```ts
   if (import.meta.url === `file://${process.argv[1]}`) {
     const lo = 0, hi = 100, step = 1
     console.assert(valueFromPointer(0.5, lo, hi, step) === 50, 'mid → 50')
     console.assert(valueFromPointer(0,   lo, hi, step) === 0,   'left → 0')
     console.assert(valueFromPointer(1,   lo, hi, step) === 100, 'right → 100')
     console.assert(valueFromPointer(1.5, lo, hi, step) === 100, 'over → clamp 100')
     console.assert(snap(7.4, 0, 5) === 5, 'snap 7.4 @ step 5 → 5')
   }
   ```
   Run with `node --experimental-strip-types --no-warnings …` if needed; otherwise embed as a comment-only "smoke test reference" since the app is Vite/React and not Node-runnable directly. Simplest: just keep it in source as a comment block describing the invariants; visual + typecheck is the real validation. **No new test framework added.**

## Decisions Log

- **`format` → `renderValue`, returns `ReactNode`**: per user direction — the value slot is a fully-customizable render slot, not just a string formatter.
- **`valuePosition` default = `'after'`**: matches the reference image (`0%` on the right).
- **Default range `[0, 100]`, default `step = 1`**: matches the reference's "0%" framing; user can override for arbitrary ranges.
- **No vertical orientation**: out of scope; the codebase has no vertical-slider need.
- **No multi-thumb**: out of scope; `value` is a single number.
- **No tooltip on drag**: the label already shows current value live; redundant.
- **Step rounding done in helper, not on every event**: keeps the pointer handler side-effect-free and trivially testable.
- **Customization through `className` + Tailwind child selectors, not per-instance props**: matches `Switch` / `NumberStepper` precedent; avoids API explosion.
- **State stays local in `Setting`**: single-row usage; no cross-row coupling. Mirror existing `switchOn` etc.