import { useState } from 'react'
import { Button } from '../ui/Button'
import { Dropdown, type DropdownPanel } from '../ui/Dropdown'
import { Preview } from './frame'

const LEVELS = ['low', 'medium', 'high', 'xhigh']

function DropdownDemo() {
	const [level, setLevel] = useState('medium')
	const [model, setModel] = useState('MiniMax-M3')
	const panel: DropdownPanel = {
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
	return (
		<Preview label="submenu">
			<Dropdown panel={panel} placement="bottom-start">
				<Button type="button" variant="ghost" size="sm">
					{model} {level}
				</Button>
			</Dropdown>
		</Preview>
	)
}

export const dropdownDoc = {
	id: 'dropdown',
	heading: 'Dropdown',
	description: '带子菜单的菜单。一行可以再向右展开，子面板可以搜索。',
	nav: ['Dropdown'],
	Demo: DropdownDemo,
}
