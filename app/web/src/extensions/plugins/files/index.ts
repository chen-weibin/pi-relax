import { FileIcon } from '../../../icons'
import type { ExtensionPlugin, ExtensionTab } from '../../types'
import { flushAndDrop } from './drafts'
import { FilesView } from './FilesView'
import { filesExplorerOpen, isFilesPayload } from './open'

function onTabClosed(tab: ExtensionTab) {
	if (!isFilesPayload(tab.payload) || tab.payload.kind !== 'file') return
	void flushAndDrop(tab.payload.path)
}

export const filesPlugin: ExtensionPlugin = {
	id: 'files',
	title: '文件',
	description: '浏览工作区目录，打开文件',
	icon: FileIcon,
	open: filesExplorerOpen,
	render: FilesView,
	onTabClosed,
}
