import { useState, type ReactNode } from 'react'
import { CheckIcon, SearchIcon } from '../icons'
import { Input, type InputStatus } from '../ui/Input'

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-[7.5rem_minmax(0,20rem)] items-start gap-3">
			<span className="pt-1.5 text-sm text-fg-3">{label}</span>
			<div>{children}</div>
		</div>
	)
}

function EnterRow() {
	const [last, setLast] = useState('')
	return (
		<Row label="回车">
			<Input placeholder="输入后回车" onPressEnter={setLast} />
			<p className="mt-1 min-h-4 text-sm text-fg-3">已提交：{last || '—'}</p>
		</Row>
	)
}

function ControlledRow() {
	const [value, setValue] = useState('受控')
	return (
		<Row label="受控">
			<Input value={value} onChange={setValue} />
			<p className="mt-1 min-h-4 text-sm text-fg-3">当前值：{value}</p>
		</Row>
	)
}

function HintReserveRow() {
	const [on, setOn] = useState(false)
	return (
		<Row label="提示占位">
			<button
				type="button"
				onClick={() => setOn((v) => !v)}
				className="mb-2 rounded-md border border-border-hover bg-surface px-2 py-1 text-sm text-fg-2 hover:bg-surface-hover"
			>
				{on ? '清空提示' : '显示提示'}
			</button>
			<Input
				hintReserve
				placeholder="下面始终留一行"
				status={on ? 'error' : undefined}
				hint={on ? '至少 2 个字符' : undefined}
			/>
			<div className="mt-1 rounded-md border border-dashed border-border px-2 py-1 text-sm text-fg-3">
				下面的字段
			</div>
		</Row>
	)
}

function HintFloatRow() {
	const [on, setOn] = useState(false)
	return (
		<Row label="提示不占位">
			<button
				type="button"
				onClick={() => setOn((v) => !v)}
				className="mb-2 rounded-md border border-border-hover bg-surface px-2 py-1 text-sm text-fg-2 hover:bg-surface-hover"
			>
				{on ? '清空提示' : '显示提示'}
			</button>
			<Input placeholder="提示贴在框下" hint={on ? '格式不对' : undefined} status={on ? 'warning' : undefined} />
			<div className="mt-1 rounded-md border border-dashed border-border px-2 py-1 text-sm text-fg-3">
				下面的字段
			</div>
		</Row>
	)
}

const statuses: InputStatus[] = ['error', 'warning', 'success']

function InputDemo() {
	return (
		<div className="grid gap-4">
			<Row label="sm">
				<Input size="sm" placeholder="小" />
			</Row>
			<Row label="md">
				<Input placeholder="默认" />
			</Row>
			<Row label="lg">
				<Input size="lg" placeholder="大" />
			</Row>
			<Row label="透明">
				<Input variant="transparent" placeholder="只有边框" defaultValue="中间是透的" />
			</Row>
			<Row label="disabled">
				<Input disabled defaultValue="不能改" />
			</Row>
			<Row label="初始值">
				<Input defaultValue="已经写好" />
			</Row>
			<Row label="可清空">
				<Input allowClear defaultValue="有字才出现叉" placeholder="输入一些文字" />
			</Row>
			<Row label="前后缀">
				<Input prefix={<SearchIcon />} suffix={<CheckIcon />} placeholder="前后图标" />
			</Row>
			<EnterRow />
			<Row label="字数">
				<Input showCount defaultValue="hello" />
			</Row>
			<Row label="字数上限">
				<Input showCount maxLength={20} defaultValue="sdfasd" />
			</Row>
			<ControlledRow />
			<Row label="非受控">
				<Input defaultValue="自己记着" allowClear />
			</Row>
			{statuses.map((status) => (
				<Row key={status} label={status}>
					<Input status={status} hintReserve defaultValue={status} hint="状态提示" />
				</Row>
			))}
			<Row label="提示分色">
				<Input status="success" hintStatus="error" hintReserve defaultValue="框是成功" hint="提示是失败" />
			</Row>
			<HintReserveRow />
			<HintFloatRow />
		</div>
	)
}

export const inputDoc = {
	id: 'input',
	heading: 'Input',
	description: '单行输入。字数在框内右侧；提示可以预留一行，也可以贴在框下不占位。',
	nav: ['Input'],
	Demo: InputDemo,
}
