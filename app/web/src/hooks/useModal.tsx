import { useState } from 'react'
import { Dialog, type DialogProps } from '../ui/Dialog'

export type ConfirmOptions = Omit<DialogProps, 'open' | 'onOpenChange'>

export function useModal() {
	const [open, setOpen] = useState(false)
	const [options, setOptions] = useState<ConfirmOptions>({})

	function confirm(next: ConfirmOptions) {
		setOptions(next)
		setOpen(true)
	}

	const holder = <Dialog open={open} onOpenChange={setOpen} {...options} />
	return { confirm, holder }
}
