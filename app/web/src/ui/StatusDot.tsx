import classNames from 'classnames'

export type StatusDotKind = 'success' | 'failure' | 'normal'

export type StatusDotProps = {
	kind: StatusDotKind
	className?: string
	label?: string
}

const BG: Record<StatusDotKind, string> = {
	success: 'var(--success)',
	failure: 'var(--error)',
	normal: 'var(--fg-disabled)',
}

export function StatusDot({ kind, className, label }: StatusDotProps) {
	return (
		<span
			role="status"
			aria-label={label ?? kind}
			className={classNames('inline-block h-1.5 w-1.5 rounded-full', className)}
			style={{ background: BG[kind] }}
		/>
	)
}