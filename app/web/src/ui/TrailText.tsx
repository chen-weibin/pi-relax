import { ShinyText } from './ShinyText'

export type TrailTextProps = {
	text: string
	shimmer?: boolean
}

/** 标题后面的辅文。字号小一档，颜色用禁用色。 */
export function TrailText({ text, shimmer = false }: TrailTextProps) {
	return shimmer ? (
		<ShinyText text={text} className="text-sm" color="var(--fg-disabled)" shineColor="var(--fg-3)" />
	) : (
		<span className="text-sm text-fg-disabled">{text}</span>
	)
}
