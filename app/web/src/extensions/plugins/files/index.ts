import { FileIcon } from '../../../icons'
import type { ExtensionPlugin } from '../../types'
import { FilesSide, FilesView } from './FilesView'
import { filesExplorerOpen } from './open'

export const filesPlugin: ExtensionPlugin = {
	id: 'files',
	title: '文件',
	description: '浏览工作区目录，打开文件',
	icon: FileIcon,
	open: filesExplorerOpen,
	render: FilesView,
	renderSide: FilesSide,
}
