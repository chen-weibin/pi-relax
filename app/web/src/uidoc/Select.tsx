import { Select, type SelectLoadOptionsParams, type SelectLoadOptionsResult } from '../ui/Select'
import { Preview } from './frame'

const options = [
	{ value: 'alpha', label: 'Alpha' },
	{ value: 'beta', label: 'Beta' },
	{ value: 'gamma', label: 'Gamma' },
	{ value: 'delta', label: 'Delta' },
]

const lazyOptions = Array.from({ length: 24 }, (_, index) => ({
	value: `n-${index + 1}`,
	label: `第 ${index + 1} 项`,
}))

function loadOptions({
	query,
	offset,
	limit,
}: SelectLoadOptionsParams): Promise<SelectLoadOptionsResult<string>> {
	const filtered = lazyOptions.filter((item) => item.label.includes(query.trim()))
	const items = filtered.slice(offset, offset + limit)
	return Promise.resolve({
		items,
		hasMore: offset + items.length < filtered.length,
	})
}

function SelectDemo() {
	return (
		<div className="grid gap-4">
			<Preview label="静态列表">
				<Select options={options} placeholder="选择" className="w-44" />
			</Preview>
			<Preview label="带搜索">
				<Select options={options} searchable placeholder="选择" className="w-44" />
			</Preview>
			<Preview label="loadOptions">
				<Select loadOptions={loadOptions} pageSize={8} searchable placeholder="加载" className="w-44" />
			</Preview>
		</div>
	)
}

export const selectDoc = {
	id: 'select',
	heading: 'Select',
	description: '静态列表、列表内搜索、以及按页加载。加载那一列滚到底会继续要下一页。',
	nav: ['Select'],
	Demo: SelectDemo,
}
