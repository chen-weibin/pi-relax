import classNames from 'classnames'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { IconGrid } from '../iconsdoc/IconGrid'
import { getIconsGroup, iconsGroups } from '../iconsdoc/catalog'
import '../styles/scrollbar.css'
import { MessageToaster } from '../ui/Message'
import { Segmented } from '../ui/Segmented'

const COLOR_OPTIONS = ['前景', '次级', '强调', '蓝'] as const
type ColorOption = (typeof COLOR_OPTIONS)[number]

const colorClass: Record<ColorOption, string> = {
	前景: 'text-fg',
	次级: 'text-fg-2',
	强调: 'text-accent',
	蓝: 'text-[#007AFF]',
}

export function IconsPage() {
	const { groupId } = useParams<{ groupId: string }>()
	const group = getIconsGroup(groupId)
	const [previewColor, setPreviewColor] = useState<ColorOption>('前景')

	if (!group) {
		return <Navigate to="/icons/color" replace />
	}

	return (
		<div className="flex h-full bg-app text-fg">
			<MessageToaster />
			<nav className="scrollbar-none h-full w-[220px] shrink-0 overflow-y-auto border-r border-border px-4 py-8">
				<p className="px-2 text-sm text-fg-3">Icons</p>
				<ul className="mt-3 flex flex-col gap-0.5">
					{iconsGroups.map((item) => {
						const current = item.id === group.id
						return (
							<li key={item.id}>
								<Link
									to={`/icons/${item.id}`}
									className={classNames(
										'block rounded-md px-2 py-1.5 text-lg font-medium transition-colors duration-150',
										current ? 'text-fg-bright' : 'text-fg-2 hover:bg-surface-hover hover:text-fg',
									)}
									aria-current={current ? 'page' : undefined}
								>
									{item.title}
								</Link>
							</li>
						)
					})}
				</ul>
			</nav>
			<main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-10 py-8">
				<div className="mx-auto flex w-full max-w-5xl flex-col">
					<h1 className="text-2xl text-fg">{group.title}</h1>
					<p className="mt-3 text-base leading-relaxed text-fg-2">{group.description}</p>
					{group.id === 'color' && (
						<div className="mt-6 flex items-center gap-3">
							<span className="text-sm text-fg-3">预览色</span>
							<Segmented
								size="sm"
								options={COLOR_OPTIONS}
								value={previewColor}
								onChange={setPreviewColor}
							/>
						</div>
					)}
					<div className={classNames('mt-6', group.id === 'color' && colorClass[previewColor])}>
						{group.sections.map((section, index) => (
							<div key={section.title || 'all'} className={index > 0 ? 'mt-10' : undefined}>
								{section.title ? (
									<h2 className="mb-4 text-lg font-medium text-fg-bright">{section.title}</h2>
								) : null}
								<IconGrid entries={section.entries} />
							</div>
						))}
					</div>
				</div>
			</main>
		</div>
	)
}
