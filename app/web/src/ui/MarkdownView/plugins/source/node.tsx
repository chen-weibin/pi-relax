import { faviconUrl } from '../../../../utils/faviconUrl'
import { SourceChip } from '../../../SourceChip'
import { useSourceOptions } from './options'

function openSource(url: string, openInNewTab: boolean) {
	if (!/^https?:\/\//.test(url)) return
	if (openInNewTab) {
		window.open(url, '_blank', 'noopener,noreferrer')
		return
	}
	window.location.assign(url)
}

/** `:source` 指令对应的节点。尺寸固定 `sm`。 */
export function SourceChipNode({ name, site }: { name?: string; site?: string }) {
	const options = useSourceOptions()
	const label = name ?? ''
	const url = site ?? ''
	return (
		<SourceChip
			name={label}
			src={faviconUrl(url)}
			size="sm"
			tooltip={url}
			onClick={() => {
				if (options.onClick) {
					options.onClick({ name: label, url })
					return
				}
				openSource(url, options.openInNewTab !== false)
			}}
		/>
	)
}
