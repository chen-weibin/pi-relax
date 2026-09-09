import { Group, type GroupProps } from 'react-resizable-panels'

export type ResizablePanelGroupProps = Omit<GroupProps, 'orientation'> & {
	orientation?: 'horizontal' | 'vertical'
}

export function ResizablePanelGroup({
	orientation = 'horizontal',
	...rest
}: ResizablePanelGroupProps) {
	return <Group orientation={orientation} {...rest} />
}
