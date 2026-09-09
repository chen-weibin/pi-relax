import { Panel, type PanelProps } from 'react-resizable-panels'

export type ResizablePanelProps = Omit<PanelProps, 'id'> & {
	id: string
}

export function ResizablePanel(props: ResizablePanelProps) {
	if (!props.id) {
		if (import.meta.env.DEV) {
			console.error('[ResizablePanel] `id` is required for layout persistence.')
		}
	}
	return <Panel {...props} />
}
