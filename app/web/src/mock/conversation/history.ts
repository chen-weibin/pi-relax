import type { CompletedMessage } from '../../conversation'

export const HISTORY_MESSAGES: CompletedMessage[] = [
	{
		role: 'user',
		id: 'hist-user-1',
		text: '请根据当前仓库结构，说明 **对话区** 应该怎么拆。\n\n- 用户消息走 Markdown\n- assistant 需要流式\n\n参考 `docs/web.md`。',
	},
	{
		role: 'assistant',
		id: 'hist-asst-1',
		parts: [
			{
				type: 'thinking',
				text: '用户在问目录切分：ui 放观感原语，components 组装业务。历史消息应一次性投影，思考块默认收起。不需要工具卡片。',
			},
			{
				type: 'text',
				text: [
					'可以按三层来：',
					'',
					'1. **Runtime** 折叠 `start/delta/end`',
					'2. **ui/** 只负责怎么画（Markdown、打字机、折叠行）',
					'3. **components/** 把块相位映射成 props',
					'',
					'用户消息用 static Markdown：',
					'',
					'```md',
					'一次写入，不走流式。',
					'```',
					'',
					'历史里的思考块保持收起即可。',
				].join('\n'),
			},
		],
	},
]
