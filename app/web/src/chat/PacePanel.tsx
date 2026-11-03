import { FRAME_MS, defaultFeed, paceLadder, type FeedConfig } from './pace'

type Props = {
	feed: FeedConfig
	onChange: (feed: FeedConfig) => void
}

function NumberField({
	label,
	value,
	min = 1,
	disabled,
	onChange,
}: {
	label: string
	value: number
	min?: number
	disabled?: boolean
	onChange?: (value: number) => void
}) {
	return (
		<label className="flex items-center justify-between gap-2 text-sm text-fg-2">
			<span className="min-w-0">{label}</span>
			<input
				type="number"
				min={min}
				disabled={disabled}
				readOnly={onChange === undefined}
				value={Number.isFinite(value) ? value : ''}
				onChange={(event) => {
					if (!onChange) return
					const next = Number(event.target.value)
					if (!Number.isInteger(next) || next < min) return
					onChange(next)
				}}
				className="h-6 w-16 shrink-0 rounded border border-border bg-surface px-1 text-right text-fg outline-none disabled:opacity-50"
			/>
		</label>
	)
}

export function PacePanel({ feed, onChange }: Props) {
	const paced = feed.mode === 'pace'
	const ladder = paceLadder(feed.lag, feed.step)

	return (
		<aside className="flex w-[240px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border px-3 py-3">
			<p className="text-sm text-fg">喂给视图</p>
			<div className="flex flex-col gap-1 text-sm text-fg-2">
				<label className="flex items-center gap-2">
					<input
						type="radio"
						name="feed-mode"
						checked={paced}
						onChange={() => onChange({ ...feed, mode: 'pace' })}
					/>
					按长度切
				</label>
				<label className="flex items-center gap-2">
					<input
						type="radio"
						name="feed-mode"
						checked={!paced}
						onChange={() => onChange({ ...feed, mode: 'direct' })}
					/>
					直接给
				</label>
			</div>
			<p className="text-xs text-fg-3">
				直接给跳过 shown，全文一到就进视图。OpenCode 平时也是这样；只有落后超过大约 512 字才再按 24ms 切开。事件本身仍会先按帧合成一次。
			</p>
			<NumberField
				label={`间隔 ×${FRAME_MS}ms`}
				value={feed.frames}
				disabled={!paced}
				onChange={(frames) => onChange({ ...feed, frames })}
			/>
			<p className="text-xs text-fg-3">{paced ? `实际 ${feed.frames * FRAME_MS}ms 一拍` : '这一档不看间隔'}</p>
			<NumberField
				label="落后 ≤"
				value={feed.lag}
				min={0}
				disabled={!paced}
				onChange={(lag) => onChange({ ...feed, lag })}
			/>
			<NumberField
				label="这时每拍字数"
				value={feed.step}
				disabled={!paced}
				onChange={(step) => onChange({ ...feed, step })}
			/>
			<p className="text-xs text-fg-3">后面按落后上限 ×2、每拍字数 ×3 推出。字数涨得比落后快。</p>
			{ladder.slice(1).map((rung, index) =>
				Number.isFinite(rung.lag) ? (
					<div key={index} className="flex flex-col gap-2">
						<NumberField label="落后 ≤" value={rung.lag} disabled />
						<NumberField label="这时每拍字数" value={rung.step} disabled />
					</div>
				) : (
					<NumberField key={index} label="再多时每拍字数" value={rung.step} disabled />
				),
			)}
			<button
				type="button"
				className="self-start text-sm text-fg-2 hover:text-fg"
				onClick={() => onChange(defaultFeed)}
			>
				恢复默认
			</button>
		</aside>
	)
}
