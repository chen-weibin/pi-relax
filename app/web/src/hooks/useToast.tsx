import classNames from 'classnames'
import { useCallback, useState } from 'react'
import { SwipeToast, type SwipeToastProps } from '../ui/SwipeToast'

/** 弹一条 toast 的配置。位置由 holder 统一决定,这里不传 placement */
export type ToastOptions = Omit<SwipeToastProps, 'placement'>

type ToastItem = { id: number; options: ToastOptions }

/** 全局递增 id,保证不同 hook 实例之间也不撞 id */
let seq = 0

/** 引信默认用动作按钮那个白(按钮是 inverse 底),组件自己的默认还是 --warning */
const DEFAULT_FUSE_COLOR = 'var(--fg)'

/**
 * 弹一条可下滑关闭的提示。跟 `useMessage` 一样:`show` 调用,`holder` 渲染一次。
 * 同一个 hook 可以同时挂多条,叠在视口右下角。
 */
export function useToast() {
	const [toasts, setToasts] = useState<ToastItem[]>([])

	/** 弹一条,返回 id */
	const show = useCallback((options: ToastOptions) => {
		const id = ++seq
		setToasts((list) => [...list, { id, options }])
		return id
	}, [])

	/** 关掉一条 */
	const dismiss = useCallback((id: number) => {
		setToasts((list) => list.filter((t) => t.id !== id))
	}, [])

	// 容器固定在视口右下角,后弹的一条排在下面(离屏幕角最近)
	const holder = (
		<div className="pointer-events-none fixed right-6 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-50 flex w-max max-w-[calc(100vw-48px)] flex-col items-end gap-2">
			{toasts.map((t) => (
				<SwipeToast
					key={t.id}
					{...t.options}
					fuseColor={t.options.fuseColor ?? DEFAULT_FUSE_COLOR}
					className={classNames('pointer-events-auto', t.options.className)}
					onClose={(reason) => {
						t.options.onClose?.(reason)
						dismiss(t.id)
					}}
				/>
			))}
		</div>
	)

	return { show, dismiss, holder }
}
