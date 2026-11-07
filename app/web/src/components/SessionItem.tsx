import { useEffect, useRef, useState, type ReactNode } from 'react'
import classNames from 'classnames'
import { RenameIcon } from '../icons'
import { nextSessionName } from '../session/rename'
import { ContextMenu } from '../ui/ContextMenu'
import type { DropdownPanel } from '../ui/Dropdown'
import { DotMatrix } from '../ui/DotMatrix'
import { StatusDot } from '../ui/StatusDot'
import { formatRelativeTime } from '../utils/relativeTime'

export type SessionStatus = 'loading' | 'success' | 'failure' | 'normal'

export interface SessionItemProps {
	title: string
	createdAt: number
	active?: boolean
	onClick?: () => void
	onRename?: (name: string) => void | Promise<void>
	status?: SessionStatus
}

function renderStatus(status: SessionStatus): ReactNode {
	switch (status) {
		case 'loading':
			return <DotMatrix size="xs" grid="3x3" />
		case 'success':
			return <StatusDot kind="success" />
		case 'failure':
			return <StatusDot kind="failure" />
		case 'normal':
			return <StatusDot kind="normal" />
	}
}

export function SessionItem({ title, createdAt, active = false, onClick, onRename, status }: SessionItemProps) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(title)
	const [pending, setPending] = useState<string | null>(null)
	const origin = useRef(title)
	const closed = useRef(false)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!editing) return
		const input = inputRef.current
		if (!input) return
		input.focus()
		input.select()
	}, [editing])

	useEffect(() => {
		if (pending !== null && title === pending) setPending(null)
	}, [pending, title])

	function begin() {
		if (!onRename) return
		origin.current = title
		closed.current = false
		setDraft(title)
		setEditing(true)
	}

	function close(save: boolean) {
		if (closed.current) return
		closed.current = true
		const next = save ? nextSessionName(origin.current, draft) : null
		setEditing(false)
		if (next) setPending(next)
		if (!next || !onRename) return
		void Promise.resolve(onRename(next)).catch((error: unknown) => {
			console.error(error)
			setPending(null)
		})
	}

	const rowClass = classNames(
		'flex h-[30px] w-full items-center gap-2.5 rounded-md pl-2.5 pr-2.5 text-left text-sm transition-colors duration-100 select-none',
		active ? 'bg-surface-active text-fg-bright' : 'text-fg-2 hover:bg-surface-hover hover:text-fg-bright',
		editing ? 'cursor-text' : 'cursor-pointer',
	)
	const row = editing ? (
		<div className={rowClass}>
			<span className="flex h-full w-3.5 shrink-0 items-center justify-center">
				{status !== undefined && renderStatus(status)}
			</span>
			<input
				ref={inputRef}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => close(true)}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault()
						close(true)
					} else if (event.key === 'Escape') {
						event.preventDefault()
						close(false)
					}
				}}
				className="min-w-0 flex-1 bg-transparent p-0 text-sm text-inherit outline-none"
			/>
			<span className="shrink-0 text-fg-3 text-xs">{formatRelativeTime(createdAt)}</span>
		</div>
	) : (
		<button type="button" onClick={onClick} onDoubleClick={begin} className={rowClass}>
			<span className="flex h-full w-3.5 shrink-0 items-center justify-center">
				{status !== undefined && renderStatus(status)}
			</span>
			<span className="min-w-0 flex-1 truncate">{pending ?? title}</span>
			<span className="shrink-0 text-fg-3 text-xs">{formatRelativeTime(createdAt)}</span>
		</button>
	)

	if (!onRename) return row

	const panel: DropdownPanel = {
		groups: [
			{
				rows: [{ id: 'rename', label: '重命名', icon: <RenameIcon />, onSelect: begin }],
			},
		],
	}
	return <ContextMenu panel={panel}>{row}</ContextMenu>
}
