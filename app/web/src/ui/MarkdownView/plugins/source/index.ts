import { SourceChipNode } from './node'
import { sourceRemarkPlugins } from './remark'

export { sourceDirective } from './remark'
export { SourceOptionsProvider, type SourceOptions } from './options'

export const sourcePlugin = {
	remarkPlugins: sourceRemarkPlugins,
	allowedTags: { 'source-chip': ['name', 'site'] },
	components: { 'source-chip': SourceChipNode },
}
