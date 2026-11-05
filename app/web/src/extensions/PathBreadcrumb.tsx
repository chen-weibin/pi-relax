import { ChevronRightIcon } from '../icons'

export function PathBreadcrumb({ path }: { path: string }) {
	const parts = path.split('/').filter(Boolean)
	return (
		<div className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-xs text-fg-3">
			{parts.map((part, index) => (
				<span key={`${part}-${index}`} className="flex min-w-0 shrink items-center gap-1">
					{index > 0 && (
						<span className="inline-flex h-2.5 w-2.5 shrink-0 [&_svg]:h-2.5 [&_svg]:w-2.5">
							<ChevronRightIcon />
						</span>
					)}
					<span
						className={
							index === parts.length - 1 ? 'shrink-0 text-fg-2' : 'min-w-0 truncate'
						}
					>
						{part}
					</span>
				</span>
			))}
		</div>
	)
}
