import classNames from 'classnames'
import { useEffect, useRef } from 'react'
import {
	DEFAULT_CONFIG,
	type AvatarConfigPatch,
	type AvatarExpression,
	type AvatarFaceSize,
	type AvatarShape,
	type AvatarSize,
} from './config.ts'
import { AvatarRenderer } from './renderer.ts'

export type {
	AvatarColors,
	AvatarConfig,
	AvatarConfigPatch,
	AvatarExpression,
	AvatarFaceSize,
	AvatarShape,
	AvatarSize,
} from './config.ts'
export { ANIMATIONS, DEFAULT_CONFIG, EXPRESSIONS, FACE_SIZES, SHAPES, avatarPalettes } from './config.ts'

export type AvatarProps = {
	/** Preset size, or a pixel number. */
	size?: AvatarSize | number
	shape?: AvatarShape
	expression?: AvatarExpression
	faceSize?: AvatarFaceSize
	colors?: AvatarConfigPatch['colors']
	outline?: AvatarConfigPatch['outline']
	animation?: AvatarConfigPatch['animation']
	/** Accessible name. Omit for a decorative avatar. */
	label?: string
	className?: string
}

export const avatarSizes: Record<AvatarSize, number> = {
	sm: 32,
	md: 40,
	lg: 52,
}

function prefersReducedMotion(): boolean {
	return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function toPatch(props: {
	shape: AvatarShape
	expression: AvatarExpression
	faceSize: AvatarFaceSize
	colors?: AvatarConfigPatch['colors']
	outline?: AvatarConfigPatch['outline']
	animation?: AvatarConfigPatch['animation']
}): AvatarConfigPatch {
	const reduced = prefersReducedMotion()
	return {
		shape: props.shape,
		expression: props.expression,
		faceSize: props.faceSize,
		colors: {
			...DEFAULT_CONFIG.colors,
			background: 'transparent',
			...props.colors,
		},
		outline: props.outline,
		animation: reduced
			? { loop: false, paused: true, speed: props.animation?.speed ?? DEFAULT_CONFIG.animation.speed }
			: props.animation,
	}
}

export function Avatar({
	size = 'md',
	shape = DEFAULT_CONFIG.shape,
	expression = DEFAULT_CONFIG.expression,
	faceSize = DEFAULT_CONFIG.faceSize,
	colors,
	outline,
	animation,
	label,
	className,
}: AvatarProps) {
	const svgRef = useRef<SVGSVGElement>(null)
	const rendererRef = useRef<AvatarRenderer | null>(null)
	const propsRef = useRef({ shape, expression, faceSize, colors, outline, animation })
	propsRef.current = { shape, expression, faceSize, colors, outline, animation }

	const px = typeof size === 'number' ? size : avatarSizes[size]

	useEffect(() => {
		const svg = svgRef.current
		if (!svg) return undefined

		const reduced = prefersReducedMotion()
		const renderer = new AvatarRenderer(svg, toPatch(propsRef.current), { reducedMotion: reduced })
		rendererRef.current = renderer

		const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
		const onMotion = () => {
			const next = prefersReducedMotion()
			renderer.setReducedMotion(next)
			renderer.setConfig(toPatch(propsRef.current))
		}
		mq?.addEventListener?.('change', onMotion)

		return () => {
			mq?.removeEventListener?.('change', onMotion)
			renderer.dispose()
			rendererRef.current = null
		}
	}, [])

	useEffect(() => {
		rendererRef.current?.setConfig(toPatch({ shape, expression, faceSize, colors, outline, animation }))
	}, [shape, expression, faceSize, colors, outline, animation])

	return (
		<span
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={classNames('inline-flex shrink-0 overflow-hidden', className)}
			style={{ width: px, height: px }}
		>
			<svg
				ref={svgRef}
				viewBox="-1.45 -1.45 2.9 2.9"
				preserveAspectRatio="xMidYMid meet"
				aria-hidden
				focusable="false"
				className="block h-full w-full"
			/>
		</span>
	)
}
