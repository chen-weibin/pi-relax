import classNames from 'classnames'
import { AnimatePresence, motion } from 'motion/react'
import { ShinyText } from './ShinyText'

export type FlipTextProps = {
	text: string
	shimmer?: boolean
	className?: string
}

/** 一行文字。`text` 变了，旧字向上移出，新字从下面进来。首次出现不播。 */
export function FlipText({ text, shimmer = false, className }: FlipTextProps) {
	return (
		<span className={classNames('grid w-full justify-items-start overflow-hidden text-left', className)}>
			<AnimatePresence initial={false}>
				<motion.span
					key={text}
					className="col-start-1 row-start-1 whitespace-nowrap text-left"
					initial={{ y: '100%' }}
					animate={{ y: '0%' }}
					exit={{ y: '-100%' }}
					transition={{ duration: 0.2, ease: 'easeOut' }}
				>
					{shimmer ? <ShinyText text={text} color="var(--fg-3)" shineColor="var(--fg-bright)" /> : text}
				</motion.span>
			</AnimatePresence>
		</span>
	)
}
