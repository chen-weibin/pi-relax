import { TitleRow } from '../ui/TitleRow'
import { Preview } from './frame'

const longDesc = 'ReadTool.tsx L1-37 后面还有很长的一段路径说明，超出这一行就省略'

function TitleRowDemo() {
	return (
		<div className="grid w-full grid-cols-2 gap-4">
			<Preview label="可点">
				<div className="w-full max-w-sm">
					<TitleRow title="查看文件" desc="ReadTool.tsx L1-37" onClick={() => {}} />
				</div>
			</Preview>
			<Preview label="扫光 / 不可点">
				<div className="flex w-full max-w-sm flex-col">
					<TitleRow title="查看文件" desc="ReadTool.tsx L1-37" shimmer />
					<TitleRow title="查看文件" desc={longDesc} disabled />
				</div>
			</Preview>
		</div>
	)
}

export const titleRowDoc = {
	id: 'title-row',
	heading: 'TitleRow',
	description: '一行标题加说明。悬停时两者都变亮，标题更亮。说明过长省略。',
	nav: ['TitleRow'],
	Demo: TitleRowDemo,
}
