import { useState } from 'react'
import { SettingGroup } from '../../ui/SettingGroup'
import { SettingRow } from '../../ui/SettingRow'
import { Switch } from '../../ui/Switch'
import { Select, type SelectOption } from '../../ui/Select'
import { NumberStepper } from '../../ui/NumberStepper'
import { ProgressBar } from '../../ui/ProgressBar'

const PLACEHOLDER_OPTIONS = [
	'设置项 1',
	'设置项 2',
	'设置项 3',
	'设置项 4',
	'设置项 5',
	'设置项 6',
	'设置项 7',
	'设置项 8',
]
const SINGLE_PLACEHOLDER = ['设置项']

const STATIC_OPTIONS: SelectOption<string>[] = [
	{ value: 'compact', label: '紧凑' },
	{ value: 'cozy', label: '舒适' },
	{ value: 'spacious', label: '宽松' },
]

const FAKE_REMOTE_ITEMS = Array.from({ length: 47 }, (_, i) => ({
	value: `opt-${i + 1}`,
	label: `远程选项 ${String(i + 1).padStart(2, '0')}`,
	disabled: i === 13,
}))

async function fakeRemoteFetch({
	query,
	offset,
	limit,
}: {
	query: string
	offset: number
	limit: number
}) {
	await new Promise((r) => setTimeout(r, 300))
	const filtered = query
		? FAKE_REMOTE_ITEMS.filter((it) => it.label.includes(query))
		: FAKE_REMOTE_ITEMS
	const items = filtered.slice(offset, offset + limit)
	return { items, hasMore: offset + limit < filtered.length }
}

/** Temporary demo rows until each Setting section has real content. */
export function SectionPlaceholder() {
	const [switchOn, setSwitchOn] = useState(false)
	const [staticPick, setStaticPick] = useState<string | undefined>()
	const [remotePick, setRemotePick] = useState<string | undefined>()
	const [stepperVal, setStepperVal] = useState(13)
	const [progressVal, setProgressVal] = useState(0)

	return (
		<div className="flex flex-col gap-6">
			<SettingGroup>
				{SINGLE_PLACEHOLDER.map((label) => (
					<SettingRow key={label} label={label} description="待实现">
						<div className="h-7 min-w-[80px] rounded-md border border-border-hover bg-surface" />
					</SettingRow>
				))}
			</SettingGroup>

			<SettingGroup title="子分组">
				{PLACEHOLDER_OPTIONS.map((label, i) => (
					<SettingRow key={label} label={label} description="待实现">
						{i === 0 ? (
							<Switch
								checked={switchOn}
								onChange={setSwitchOn}
								ariaLabel={label}
							/>
						) : i === 1 ? (
							<Select
								className=""
								placeholder="选一个"
								value={staticPick}
								onChange={setStaticPick}
								options={STATIC_OPTIONS}
								dropdownWidth={200}
								placement="bottom-end"
							/>
						) : i === 2 ? (
							<Select
								className=""
								placeholder="搜索远程选项"
								value={remotePick}
								onChange={setRemotePick}
								loadOptions={fakeRemoteFetch}
								searchable
								pageSize={10}
								dropdownWidth={200}
								placement="bottom-end"
							/>
						) : i === 3 ? (
							<NumberStepper
								value={stepperVal}
								onChange={setStepperVal}
								min={1}
								max={99}
								ariaLabel={label}
							/>
						) : i === 4 ? (
							<ProgressBar
								value={progressVal}
								onChange={setProgressVal}
								width={130}
								filled={false}
								ariaLabel={label}
								className="pr-2"
							/>
						) : (
							<div className="h-7 min-w-[80px] rounded-md border border-border-hover bg-surface" />
						)}
					</SettingRow>
				))}
			</SettingGroup>
		</div>
	)
}
