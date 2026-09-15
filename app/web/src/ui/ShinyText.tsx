import { useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'

export type ShinyTextProps = {
	text: string
	disabled?: boolean
	speed?: number
	className?: string
	color?: string
	shineColor?: string
	spread?: number
	yoyo?: boolean
	pauseOnHover?: boolean
	direction?: 'left' | 'right'
	delay?: number
}

export function ShinyText({
	text,
	disabled = false,
	speed = 2,
	className,
	color = '#b5b5b5',
	shineColor = '#ffffff',
	spread = 120,
	yoyo = false,
	pauseOnHover = false,
	direction = 'left',
	delay = 0,
}: ShinyTextProps) {
	const [paused, setPaused] = useState(false)
	const progress = useMotionValue(0)
	const elapsedRef = useRef(0)
	const lastTimeRef = useRef<number | null>(null)
	const directionRef = useRef(direction === 'left' ? 1 : -1)

	const animationDuration = speed * 1000
	const delayDuration = delay * 1000

	useAnimationFrame((time) => {
		if (disabled || paused) {
			lastTimeRef.current = null
			return
		}
		if (lastTimeRef.current === null) {
			lastTimeRef.current = time
			return
		}
		const deltaTime = time - lastTimeRef.current
		lastTimeRef.current = time
		elapsedRef.current += deltaTime

		const cycleDuration = animationDuration + delayDuration
		const cycleTime = elapsedRef.current % cycleDuration

		if (yoyo) {
			const fullCycle = cycleDuration * 2
			const t = cycleTime
			if (t < animationDuration) {
				const p = (t / animationDuration) * 100
				progress.set(directionRef.current === 1 ? p : 100 - p)
			} else if (t < cycleDuration) {
				progress.set(directionRef.current === 1 ? 100 : 0)
			} else if (t < cycleDuration + animationDuration) {
				const p = 100 - ((t - cycleDuration) / animationDuration) * 100
				progress.set(directionRef.current === 1 ? p : 100 - p)
			} else {
				progress.set(directionRef.current === 1 ? 0 : 100)
			}
			void fullCycle
		} else if (cycleTime < animationDuration) {
			const p = (cycleTime / animationDuration) * 100
			progress.set(directionRef.current === 1 ? p : 100 - p)
		} else {
			progress.set(directionRef.current === 1 ? 100 : 0)
		}
	})

	useEffect(() => {
		directionRef.current = direction === 'left' ? 1 : -1
		elapsedRef.current = 0
		progress.set(0)
	}, [direction, progress])

	const backgroundPosition = useTransform(progress, (p) => `${150 - p * 2}% center`)

	const onEnter = useCallback(() => {
		if (pauseOnHover) setPaused(true)
	}, [pauseOnHover])
	const onLeave = useCallback(() => {
		if (pauseOnHover) setPaused(false)
	}, [pauseOnHover])

	const gradientStyle = {
		backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
		backgroundSize: '200% auto',
		WebkitBackgroundClip: 'text',
		backgroundClip: 'text',
		WebkitTextFillColor: 'transparent',
	} as React.CSSProperties

	return (
		<motion.span
			className={classNames('inline-block', className)}
			style={{ ...gradientStyle, backgroundPosition }}
			onMouseEnter={onEnter}
			onMouseLeave={onLeave}
		>
			{text}
		</motion.span>
	)
}
