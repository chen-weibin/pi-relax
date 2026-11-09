import { useCallback, type ReactNode } from 'react'
import { MessageToaster, message, type MessageOptions } from '../ui/Message'

export function useMessage() {
	const show = useCallback((text: ReactNode, options?: MessageOptions) => message(text, options), [])

	const holder = <MessageToaster />

	return { show, holder }
}
