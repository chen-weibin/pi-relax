import { useEffect, useSyncExternalStore } from 'react'
import { ChevronRightIcon } from '../icons'
import {
	chooseModel,
	chooseThinking,
	getModelPickerSnapshot,
	startModelList,
	subscribeModelPicker,
} from '../session/modelPicker'
import { Button } from '../ui/Button'
import { Dropdown, type DropdownPanel } from '../ui/Dropdown'

export function ModelPicker({ onError }: { onError?: (message: string) => void }) {
	const snap = useSyncExternalStore(subscribeModelPicker, getModelPickerSnapshot, getModelPickerSnapshot)
	useEffect(() => startModelList(), [])

	const report = (error: unknown) => {
		onError?.(error instanceof Error ? error.message : '切换模型失败')
	}

	const panel: DropdownPanel = {
		width: 200,
		groups: [
			{
				rows: [
					{
						id: 'thinking',
						label: '思考强度',
						detail: snap.thinking,
						panel: {
							width: 160,
							groups: [
								{
									rows: (snap.levels.length > 0 ? snap.levels : [snap.thinking]).filter(Boolean).map((level) => ({
										id: level,
										label: level,
										checked: level === snap.thinking,
										onSelect: () => chooseThinking(level),
									})),
								},
							],
						},
					},
					{
						id: 'model',
						label: '模型',
						detail: snap.modelLabel,
						panel: {
							width: 200,
							searchable: true,
							searchPlaceholder: '搜索模型',
							groups: snap.groups.map((group, index) => ({
								label: group.label,
								rows: group.rows.map((row) => ({
									id: `${index}:${row.provider}\t${row.id}`,
									label: row.label,
									checked: snap.shown?.provider === row.provider && snap.shown.id === row.id,
									disabled: row.unavailable,
									onSelect: () => {
										void chooseModel({ provider: row.provider, id: row.id }).catch(report)
									},
								})),
							})),
						},
					},
				],
			},
		],
	}

	return (
		<Dropdown panel={panel} placement="top-end">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={snap.disabled || !snap.loaded}
				className="max-w-[220px] min-w-0 overflow-hidden"
				suffix={
					<span className="rotate-90 text-fg-3 [&_svg]:!h-[11px] [&_svg]:!w-[11px]">
						<ChevronRightIcon />
					</span>
				}
			>
				<span className="min-w-0 truncate">{snap.label}</span>
			</Button>
		</Dropdown>
	)
}
