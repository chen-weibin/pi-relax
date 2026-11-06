import { useState, type ComponentProps } from 'react'
import { AppearanceIcon, FileIcon, PlusIcon, SettingsIcon, TrashIcon } from '../icons'
import { ContextMenu } from '../ui/ContextMenu'
import type { DropdownPanel } from '../ui/Dropdown'
import { Preview } from './frame'

const LEVELS = ['low', 'medium', 'high', 'xhigh']

function Area({ children, ...rest }: { children: string } & ComponentProps<'div'>) {
	return (
		<div
			{...rest}
			className="flex h-36 w-56 items-center justify-center rounded-lg border border-dashed border-border px-3 text-center text-sm text-fg-3"
		>
			{children}
		</div>
	)
}

function ContextMenuDemo() {
	const [level, setLevel] = useState('medium')
	const [model, setModel] = useState('MiniMax-M3')
	const [action, setAction] = useState('还没选')
	const [pinned, setPinned] = useState(true)
	const nested: DropdownPanel = {
		width: 220,
		groups: [
			{
				rows: [
					{
						id: 'thinking',
						label: '思考强度',
						detail: level,
						panel: {
							width: 160,
							groups: [
								{
									rows: LEVELS.map((item) => ({
										id: item,
										label: item,
										checked: item === level,
										onSelect: () => setLevel(item),
									})),
								},
							],
						},
					},
					{
						id: 'model',
						label: '模型',
						detail: model,
						panel: {
							width: 200,
							searchable: true,
							searchPlaceholder: '搜索模型',
							groups: [
								{
									label: 'minimax',
									rows: [
										{ id: 'm3', label: 'MiniMax-M3', checked: model === 'MiniMax-M3', onSelect: () => setModel('MiniMax-M3') },
										{ id: 'm2', label: 'MiniMax-M2', checked: model === 'MiniMax-M2', onSelect: () => setModel('MiniMax-M2') },
									],
								},
							],
						},
					},
				],
			},
		],
	}
	const icons: DropdownPanel = {
		width: 200,
		groups: [
			{
				rows: [
					{ id: 'new', label: '新建', icon: <PlusIcon />, onSelect: () => setAction('新建') },
					{ id: 'rename', label: '重命名', icon: <FileIcon />, detail: 'F2', onSelect: () => setAction('重命名') },
					{ id: 'icon', label: '编辑图标', icon: <AppearanceIcon />, onSelect: () => setAction('编辑图标') },
					{ id: 'unread', label: '标记未读', icon: <SettingsIcon />, disabled: true, onSelect: () => setAction('标记未读') },
				],
			},
			{
				rows: [{ id: 'delete', label: '删除', icon: <TrashIcon />, onSelect: () => setAction('删除') }],
			},
		],
	}
	const checks: DropdownPanel = {
		width: 160,
		groups: [
			{
				rows: [
					{ id: 'on', label: '固定', checked: pinned, onSelect: () => setPinned(true) },
					{ id: 'off', label: '取消固定', checked: !pinned, onSelect: () => setPinned(false) },
				],
			},
		],
	}
	return (
		<div className="flex flex-wrap items-start justify-center gap-8">
			<Preview label="子菜单">
				<ContextMenu panel={nested}>
					<Area>在这里右键</Area>
				</ContextMenu>
			</Preview>
			<Preview label="图标 / 禁用">
				<ContextMenu panel={icons}>
					<Area>{action}</Area>
				</ContextMenu>
			</Preview>
			<Preview label="只有文字">
				<ContextMenu panel={checks}>
					<Area>{pinned ? '已固定' : '未固定'}</Area>
				</ContextMenu>
			</Preview>
		</div>
	)
}

export const contextMenuDoc = {
	id: 'context-menu',
	heading: 'ContextMenu',
	description: '右键菜单。从点击点的右下角展开，靠边时自动翻转。面板与 Dropdown 相同，可以只有一级，也可以带图标和禁用。',
	nav: ['ContextMenu'],
	Demo: ContextMenuDemo,
}
