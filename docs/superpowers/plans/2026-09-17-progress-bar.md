# ProgressBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encapsulate an interactive horizontal slider (`ProgressBar`) with optional value slot, and wire it into `Setting.tsx` row 5 as the smoke test.

**Architecture:** Single-file `ui/ProgressBar.tsx` component following the same controlled/uncontrolled pattern as `NumberStepper`. Pure helpers (`clamp` / `snap` / `percent` / `valueFromPointer`) at module scope; React state only for the uncontrolled branch. Pointer events + `setPointerCapture` for drag; keyboard nav via `onKeyDown`. One wiring change in `Setting.tsx` (i === 4). Two doc files updated to expose the new component.

**Tech Stack:** React 19, Tailwind v4 (tokens via `@theme inline`), `classnames` for conditional classes, native pointer/keyboard events.

## Global Constraints

- **TypeScript strict** (project default). All new code must typecheck via `pnpm --filter web typecheck` (= `tsc --noEmit && tsc --noEmit -p tsconfig.node.json`).
- **`classnames` only** for conditional class composition — never template strings (`docs/web.md`).
- **Tailwind utilities only** — no inline `style={...}` except for two required dynamic values: thumb `left` (percent-based) and fill `width` (percent-based). Both are unavoidable for a slider.
- **No new dependencies**. The project does not have a test framework; verification = `typecheck` + dev-server visual check.
- **Domain-agnostic → `src/ui/`**; `src/components/` is for Sidebar/Setting/etc. that own domain state (`docs/web.md` § 何时放进 `ui/`).
- **No automatic commits** — per `AGENTS.md`, leave all changes in the working tree; the user commits.
- **Use tabs for indentation** (matches the codebase; `editorconfig` convention).
- **No comments in source unless explicitly required** (project rule; `AGENTS.md` § 编码原则).

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `app/web/src/ui/ProgressBar.tsx` | create | Interactive slider + value slot + a11y. Exports `{ProgressBar}` and `ProgressBarProps`. |
| `app/web/src/components/Setting.tsx` | modify | Add `progressVal` state + replace `i === 4` placeholder with `<ProgressBar>`. |
| `docs/ui.md` | modify | Add `ProgressBar` to decision table, anti-examples, and a new component section. |
| `docs/web.md` | modify | Add `ProgressBar` row to § UI 组件库 pointer table. |

---

### Task 1: Create `ui/ProgressBar.tsx`

**Files:**
- Create: `app/web/src/ui/ProgressBar.tsx`

**Interfaces:**
- Consumes: nothing (no deps on other tasks).
- Produces: `export interface ProgressBarProps` (see spec); `export function ProgressBar(props: ProgressBarProps): JSX.Element`.

- [ ] **Step 1: Write the file with the full component**

Create `app/web/src/ui/ProgressBar.tsx` with this content (verbatim — copy the whole block):

```tsx
import { useRef, useState, type ReactNode, type KeyboardEvent, type PointerEvent } from 'react'
import classNames from 'classnames'

export interface ProgressBarProps {
	value?: number
	defaultValue?: number
	onChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
	disabled?: boolean

	showValue?: boolean
	renderValue?: (value: number, percent: number) => ReactNode
	valuePosition?: 'before' | 'after'

	block?: boolean
	width?: number | string
	filled?: boolean

	ariaLabel?: string
	className?: string
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const snap = (n: number, lo: number, step: number) => lo + Math.round((n - lo) / step) * step
const percent = (v: number, lo: number, hi: number) =>
	hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100
const valueFromPointer = (
	ratio: number,
	lo: number,
	hi: number,
	step: number,
): number => clamp(snap(lo + ratio * (hi - lo), lo, step), lo, hi)

export function ProgressBar({
	value,
	defaultValue,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	disabled,
	showValue = true,
	renderValue,
	valuePosition = 'after',
	block,
	width,
	filled = true,
	ariaLabel,
	className,
}: ProgressBarProps) {
	const wrapperStyle =
		width !== undefined
			? { width: typeof width === 'number' ? `${width}px` : width }
			: undefined
	const wrapperIsBlock = block || width !== undefined
	const [internal, setInternal] = useState<number>(defaultValue ?? min)
	const isControlled = value !== undefined
	const rawCurrent = isControlled ? value : internal
	const current = clamp(rawCurrent, min, max)
	const pct = percent(current, min, max)

	const trackRef = useRef<HTMLDivElement>(null)
	const bigStep = Math.max(step, (max - min) / 10)

	const commit = (next: number) => {
		const clamped = clamp(next, min, max)
		if (clamped === current) return
		if (!isControlled) setInternal(clamped)
		onChange?.(clamped)
	}

	const updateFromClientX = (clientX: number) => {
		if (disabled) return
		const track = trackRef.current
		if (!track) return
		const rect = track.getBoundingClientRect()
		if (rect.width === 0) return
		const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
		commit(valueFromPointer(ratio, min, max, step))
	}

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled) return
		if (e.button !== 0 && e.pointerType === 'mouse') return
		e.preventDefault()
		e.currentTarget.setPointerCapture(e.pointerId)
		updateFromClientX(e.clientX)
	}

	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (disabled) return
		if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
		updateFromClientX(e.clientX)
	}

	const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId)
		}
	}

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return
		let next: number | null = null
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				next = current - step
				break
			case 'ArrowRight':
			case 'ArrowUp':
				next = current + step
				break
			case 'Home':
				next = min
				break
			case 'End':
				next = max
				break
			case 'PageDown':
				next = current - bigStep
				break
			case 'PageUp':
				next = current + bigStep
				break
		}
		if (next === null) return
		e.preventDefault()
		commit(clamp(snap(next, min, step), min, max))
	}

	const valueSlot = (
		<span className="text-right text-md tabular-nums text-fg-2">
			{renderValue ? renderValue(current, pct) : `${Math.round(pct)}%`}
		</span>
	)

	return (
		<span
			style={wrapperStyle}
			className={classNames(
				wrapperIsBlock ? 'flex' : 'inline-flex',
				'h-[26px] items-center gap-2',
				block ? 'w-full' : width === undefined && 'w-[100px]',
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
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onKeyDown={onKeyDown}
				className="relative flex h-3 flex-1 cursor-pointer touch-none select-none items-center"
			>
				<div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-hover" />
				{filled && (
					<div
						className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg-3"
						style={{ width: `${pct}%` }}
					/>
				)}
				<div
					className="relative h-3 w-3 rounded-full bg-fg-2 shadow transition-colors hover:bg-fg-bright focus-visible:bg-fg-bright"
					style={{ left: `calc(${pct}% - 6px)` }}
				/>
			</div>
			{showValue && valuePosition === 'after' && valueSlot}
		</span>
	)
}
```

Notes baked into the code:
- `clamp(rawCurrent, min, max)` makes a controlled parent that passes out-of-range values still render a sane thumb position.
- `commit` is the single write path for both drag and keyboard; it no-ops on equal values to avoid redundant `onChange` calls.
- `e.button !== 0` guard skips non-left mouse buttons so right-click doesn't move the thumb.
- `e.preventDefault()` on pointerdown stops the default text selection / focus stealing.
- `PageUp`/`PageDown` step is `Math.max(step, (max - min) / 10)` — falls back to `step` when the range is smaller than `10 * step`, so `snap` never rounds back to the current value (no-op).

- [ ] **Step 2: Run typecheck**

Run from repo root: `pnpm --filter web typecheck`
Expected: PASS. If it fails, fix the errors before continuing. Common issues: missing import, wrong prop name typo.

- [ ] **Step 3: Sanity-check by eye**

Open `app/web/src/ui/ProgressBar.tsx` and confirm:
- Exports: `ProgressBar` (function), `ProgressBarProps` (interface). Both at module scope, both exported.
- No `import` from `components/` or `hooks/`.
- File uses tabs (matches `NumberStepper.tsx` / `Switch.tsx`).
- No comments in the body.

---

### Task 2: Wire `ProgressBar` into `Setting.tsx` row 5

**Files:**
- Modify: `app/web/src/components/Setting.tsx`

**Interfaces:**
- Consumes: `ProgressBar` from `../ui/ProgressBar` (added in Task 1).
- Produces: a Setting page where row 5 (`i === 4`) renders an interactive slider with live `%` label.

- [ ] **Step 1: Add the import**

In `app/web/src/components/Setting.tsx`, add this import after the existing `NumberStepper` import (line ~16):

```tsx
import { ProgressBar } from '../ui/ProgressBar'
```

- [ ] **Step 2: Add state**

After the existing `useState` calls (currently at line ~83, just after `const [stepperVal, setStepperVal] = useState(13)`), add:

```tsx
const [progressVal, setProgressVal] = useState(0)
```

- [ ] **Step 3: Replace the `i === 4` placeholder branch**

In the same file, inside the `.map((label, i) => …)` chain (currently around lines 195–205), update the conditional tail so the `i === 4` branch renders `<ProgressBar>` instead of the placeholder `<div>`. The full replacement block is:

```tsx
) : i === 4 ? (
	<ProgressBar
		value={progressVal}
		onChange={setProgressVal}
		width={130}
		filled={false}
		ariaLabel={label}
	/>
) : (
	<div className="h-7 min-w-[80px] rounded-md border border-border-hover bg-surface" />
)}
```

(Replaces lines 203–205; keep the `)` before `:` exactly as it is.)

- [ ] **Step 4: Run typecheck**

Run from repo root: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 5: Visual smoke test**

Run `pnpm dev:web`, open the Setting page (click 设置), pick 通用 category, scroll to 子分组 → 设置项 5. Verify:
1. Slider thumb visible on the left of the track; `0%` label visible on the right.
2. Drag the thumb — `0%` updates live.
3. Click anywhere on the empty track — thumb jumps there, label updates.
4. Tab into the slider — press `→`/`←`: value steps ±1 (so label moves `0% → 1% → 2%` or `0% → 100% → 99%` near edges). Press `Home`: jumps to `0%`. Press `End`: jumps to `100%`.
5. Resize the window narrower than ~150px: thumb stays inside the wrapper, label doesn't truncate (label has `min-w-[3rem]`).

If anything fails, fix and re-run the typecheck before continuing.

---

### Task 3: Doc sync — `docs/ui.md`

**Files:**
- Modify: `docs/ui.md`

**Interfaces:**
- Consumes: the API from Task 1; the decision-table format already in `docs/ui.md`.
- Produces: `docs/ui.md` decision table row, anti-examples row, and a new `## ProgressBar` section matching the depth of `## NumberStepper`.

- [ ] **Step 1: Add a decision-table row**

Open `docs/ui.md`. Find the decision table (search for `| 数字步进器(- n + 圆角 pill)`). Immediately after that row, insert a new row:

```markdown
| 连续范围拖拽(0–100% / 任意区间,带 thumb + 槽位) | [`ProgressBar`](#progressbar) | 不要写裸 `<input type="range">`(样式无法走 token、a11y / 键盘 / pointer capture 都要自己粘) |
```

- [ ] **Step 2: Add an anti-example row**

Find the anti-examples table (search for `| 反例 | 为什么 |`). Immediately after the existing `NumberStepper` row (search for `| 给整对象(…)` — adjust to find the right anchor; specifically the row about `MessageSurface` per-row), add:

```markdown
| 给 `ProgressBar` 加 `color` / `trackColor` / `thumbColor` 等 per-instance 颜色 prop | 颜色走 token(`bg-fg-3` / `bg-border-hover`);想换色通过外层 `className` + 子选择器覆盖,不要把调色板塞进 API |
```

- [ ] **Step 3: Add the `## ProgressBar` section**

Append a new section at the end of the component reference (after `## NumberStepper`'s last line — "外层 `overflow-hidden` 让两端按钮的 hover 高亮不会越出 pill 圆角;**内部不加分隔线**"), before `## Select`. Use exactly this body:

```markdown
## ProgressBar

单文件 `ui/ProgressBar.tsx`。水平拖拽滑块:track + 圆形 thumb + 可选数值槽位。`role="slider"` + `aria-valuemin/max/now` + 键盘(←/→/Home/End/PageUp/PageDown)+ pointer capture 拖拽。

**查阅时机**:在 [`SettingRow`](#settingrow) 里放连续范围控件(百分比 / 字号 / 透明度 / 任意 min–max),或评估是否写裸 `<input type="range">`。

**何时用**:

- 连续范围选择(想直接拖到任意点,而不是 ±1 步进)
- 想直接拿到 `(value: number) => void` 的简洁回调(而不是 `ChangeEvent<HTMLInputElement>`)
- 想让 thumb / fill / track 颜色自动跟随 token(`bg-fg-3` / `bg-border-hover`)
- 想统一键盘 / 触摸 / pointer capture / 数值槽位格式化

**何时不用**:

- 离散整数 / 小数步进 → [`NumberStepper`](#numberstepper)
- 二态开关 → [`Switch`](#switch)
- 单选下拉 → [`Select`](#select)
- 需要原生 form 集成(`<input type="range">` 的 `name` / `value` / form 提交)→ 用原生 `range` + 视觉包装
- 垂直方向 / 多 thumb(range selection)→ 自己写,本组件只支持单值水平

**API**:

```tsx
<ProgressBar
  value={progress}                  // 受控;传了就走受控
  defaultValue={0}                  // 非受控初始值
  onChange={setProgress}            // 每次变化(已 clamp + snap 到 step)
  min={0}                           // 下界,默认 0
  max={100}                         // 上界,默认 100
  step={1}                          // 步长,默认 1
  disabled={false}
  showValue={true}                  // 是否渲染数值槽位,默认 true
  renderValue={(v, p) => `${p}%`}   // 自定义槽位内容(返回 ReactNode)
  valuePosition="after"             // 'before' | 'after',默认 'after'
  ariaLabel="…"                     // 屏幕阅读器朗读
  className="…"                     // 透传到外层 wrapper
/>
```

| 项 | 值 |
|---|---|
| 外层 | 默认 `inline-flex h-[26px] w-[100px] items-center gap-2`(与 `NumberStepper` / `Select` 同高,放进 `SettingRow` 右槽自然对齐);`block` 或 `width` 任一为 true 时切换为 `flex h-[26px] items-center gap-2`,`block` 再追加 `w-full`,`width` 通过 inline `style.width` 写入 |
| 数值槽位 | `text-right text-md tabular-nums text-fg-2`(`tabular-nums` 让数字等宽;无 `min-w`,槽位按内容自适应) |
| Track | 相对定位 `flex h-3 flex-1`,背景 `absolute inset-x-0 h-1 bg-border-hover`,**可选**填充 `absolute left-0 h-1 bg-fg-3`(宽度 = `value` 对应的 `percent`,`filled=false` 时不渲染) |
| Thumb | 12×12 `relative h-3 w-3 rounded-full bg-fg-2 shadow`,`style={{ left: \`calc(${pct}% - 6px)\` }}` 让 thumb 中心对齐百分位;hover / focus → `bg-fg-bright`(默认比 fill `bg-fg-3` 亮一档,thumb 与填充有区分度) |
| 交互 | `onPointerDown` 起抓 + `setPointerCapture` + `updateFromClientX`;`onPointerMove` 在捕获态才更新;`onPointerUp` / `onPointerCancel` 释放 |
| 键盘 | `←`/`↓` `-step`、`→`/`↑` `+step`、`Home` → `min`、`End` → `max`、`PageUp`/`PageDown` ±`Math.max(step, (max-min)/10)`(再 snap) |
| Disabled | 整体 `opacity-50`;pointer / keydown 直接 return;`tabIndex={-1}` |
| 受控 / 非受控 | `isControlled = value !== undefined`,模式同 [`NumberStepper`](#numberstepper) |
| 钳制 | `clamp(rawCurrent, min, max)` 用于显示;commit 时也 `clamp(snap(...), min, max)`,消费方拿到的永远是区间内 + step 对齐值 |

**实现要点**:

- `valueFromPointer(ratio, lo, hi, step)` 把 `[0, 1]` 的鼠标位置算成 `(lo + ratio * (hi - lo))` → `snap` → `clamp`。所有计算在模块作用域的纯函数里,组件只负责事件绑定 + state 写回。
- `commit(next)` 是唯一的写路径:clamp 后若等于当前值直接 return(避免重复 `onChange`);否则 `setInternal` (非受控) + `onChange?.(clamped)`。
- 受控模式下父组件传入越界值时,thumb 用 `clamp(rawCurrent, min, max)` 显示,不会"飞出去";但不会反向通知父组件修正(由父组件自行管理状态)。

**与 token 的配合**:track / fill / thumb 颜色全部走 CSS 变量(`bg-border-hover` / `bg-fg-3` / `bg-fg-bright`),跟随主题切换。消费方若要换色,通过 `className` 传 `[&_.bg-fg-3]:bg-accent` 之类的子选择器覆盖 — 不在组件 API 里开 per-instance 颜色 prop。

**踩坑备忘**:

- 不要给 `<input type="range">` 套样式替代本组件 — 浏览器原生 thumb 在 Chrome / Safari / Firefox 视觉差很大,且 `pointer capture` 需要自己粘。
- 受控 + 父组件 `value` 没更新,thumb 看起来"按了没反应"——这是 React 受控组件语义,不是 bug。父组件必须在 `onChange` 里 `setState`。
- 拖拽时浏览器默认会选中 track 周围文本,`touch-none select-none` + `e.preventDefault()` 双重阻断。
- 右键点击(`e.button !== 0`)不应触发移动;本组件 guard 在 pointerdown 处(仅鼠标指针类型生效,触摸 / 笔不受影响)。
- `PageUp`/`PageDown` 的步长 `Math.max(step, (max - min) / 10)`:在窄区间(如 `min=0, max=5`)`step=1` 时不会小于 step,避免 `snap` 把结果四舍五入回 current 导致 no-op;在默认 0–100 时仍按 10% 跳。
- thumb 在 0% / 100% 边缘会有一半溢出 track(中心对齐 edge)。这是常见 UX 约定,本组件不特意内缩 — 若需要严格内缩,改 thumb `left` 为 `calc(${pct}% ) + 半 thumb 内偏移`,但需要重新算 fill 边界,得不偿失。
```

- [ ] **Step 4: Run typecheck (sanity, since this is docs)**

Docs don't affect compile, but run `pnpm --filter web typecheck` to confirm no doc typos slipped into code-fence blocks (TypeScript inside markdown is sometimes picked up by tooling). Expected: PASS.

---

### Task 4: Doc sync — `docs/web.md` pointer table

**Files:**
- Modify: `docs/web.md`

**Interfaces:**
- Consumes: the pointer-table format in `docs/web.md` § UI 组件库(`ui/`)→ 当前组件(指针).
- Produces: a new row pointing at `ui.md#progressbar`.

- [ ] **Step 1: Add the pointer row**

Open `docs/web.md`. Find the § UI 组件库 pointer table. After the `Switch` row, insert:

```markdown
| `ProgressBar` | 水平拖拽滑块 + 数值槽位(thumb / track / 键盘 / pointer capture) | [`ui.md#progressbar`](ui.md#progressbar) |
```

- [ ] **Step 2: Verify cross-link resolves**

Open `docs/web.md` and confirm the new row's anchor `ui.md#progressbar` matches the section header in `docs/ui.md` (must be lowercase, hyphenated). The new section title in Task 3 is `## ProgressBar` → anchor is `#progressbar`. ✓
```

---

## Self-Review

**Spec coverage**:
- ✅ Goal → Task 1 + 2
- ✅ Out of Scope (no vertical / no multi-thumb) → enforced by not implementing those props (Task 1 deliberately omits them)
- ✅ Architecture / file layout → Task 1 file path matches spec
- ✅ Component shape (props) → Task 1 Step 1 code matches spec
- ✅ Default `renderValue` returns `\`${Math.round(pct)}%\`` → Task 1 Step 1
- ✅ Pure helpers (clamp / snap / percent / valueFromPointer) → Task 1 Step 1
- ✅ Behavior (click / pointer drag / keyboard / PageUp/PageDown) → Task 1 Step 1
- ✅ Controlled vs uncontrolled mirroring NumberStepper → Task 1 Step 1
- ✅ Disabled → Task 1 Step 1 (`disabled` flag gates everything + opacity)
- ✅ Out-of-range input → Task 1 Step 1 (`clamp(rawCurrent, min, max)` + `commit` clamps)
- ✅ Render structure → Task 1 Step 1
- ✅ Visual Spec table → Task 1 Step 1 + Task 3 Step 3 visual doc
- ✅ Wiring in `Setting.tsx` → Task 2 Step 1–5
- ✅ Docs sync (`ui.md` decision table + anti-examples + component section; `web.md` pointer table) → Task 3 + Task 4
- ✅ Validation (typecheck + visual smoke) → Task 1 Step 2, Task 2 Step 4–5
- ✅ No new test framework → global constraint + no test files created

**Placeholder scan**:
- No "TBD" / "TODO" / "fill in later" in any task.
- Every code block contains the actual code to type.
- No "add appropriate tests" without test code — there are no test files; the plan is honest about that (global constraint).

**Type / name consistency**:
- `ProgressBarProps` used consistently (spec + Task 1 + Task 3 docs).
- `valueFromPointer` defined in Task 1 only; not referenced anywhere else. ✓
- `progressVal` / `setProgressVal` defined in Task 2; not referenced anywhere else. ✓
- `current`, `pct` are internal names; not part of public surface. ✓
- Anchor `ui.md#progressbar` matches `## ProgressBar` heading. ✓