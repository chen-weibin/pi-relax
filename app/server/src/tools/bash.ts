import {
	createBashToolDefinition,
	type BashToolOptions,
	type ToolDefinition,
} from '@earendil-works/pi-coding-agent'

/**
 * 模型侧看到的 JSON Schema。
 *
 * 基座给的是 typebox 的 TObject，带一个不可枚举的 `~kind`。展开对象会把它丢掉，
 * 剩下的就是普通 JSON Schema，校验走 AJV。这里按 JSON Schema 处理，不引 typebox。
 */
type ObjectSchema = {
	type: 'object'
	required: string[]
	properties: Record<string, unknown>
}

const DESCRIPTION_PROPERTY = {
	type: 'string',
	description:
		"One short sentence saying what this command does, in the language the user is writing in. Shown as the tool's title.",
}

/**
 * 内建 bash 的覆盖版：多一个必填的 description。
 *
 * 只换模型侧 schema。执行逻辑、输出结构、structuredContent、渲染全部沿用内建。
 * 内建的 execute 只取 command 和 timeout，多出来的 description 会被忽略。
 */
export function bashWithDescription(cwd: string, options?: BashToolOptions): ToolDefinition {
	const base = createBashToolDefinition(cwd, options)
	const schema = base.parameters as unknown as ObjectSchema
	// 整体再转一次：ToolDefinition 的默认泛型把 renderCall 的入参放宽成 unknown，
	// 内建渲染器的签名更窄，装不进去。渲染器只有 TUI 会用，服务端走 SDK 这条路不画工具。
	return {
		...base,
		parameters: {
			...schema,
			required: [...schema.required, 'description'],
			properties: { ...schema.properties, description: DESCRIPTION_PROPERTY },
		} as unknown as typeof base.parameters,
	} as unknown as ToolDefinition
}
