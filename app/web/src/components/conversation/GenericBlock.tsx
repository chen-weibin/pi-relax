export type GenericBlockProps = {
	block: { kind: string }
}

export function GenericBlock({ block }: GenericBlockProps) {
	return <div className="text-fg-3 text-sm">{block.kind}</div>
}
