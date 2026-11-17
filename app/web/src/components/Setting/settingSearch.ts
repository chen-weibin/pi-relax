export type SettingCategory = 'general' | 'appearance' | 'models' | 'agents'

/** Group nodes a conditional row can scroll to when it is not mounted. */
export const SETTING_GROUP_IDS = ['avatar', 'builtin'] as const

export type SettingGroupId = (typeof SETTING_GROUP_IDS)[number]

export type SettingEntry = {
	id: string
	category: SettingCategory
	/** Text shown after the category name in a search result. */
	label: string
	keywords: readonly string[]
	/** Scrolled when the row itself is not mounted. Must be a group anchor, not another entry. */
	fallbackId?: SettingGroupId
}

export const SETTING_ENTRIES = [
	{ id: 'display-name', category: 'general', label: '用户名', keywords: ['显示名', 'displayName'] },
	{
		id: 'avatar-source',
		category: 'general',
		label: '来源',
		keywords: ['头像', '内置', '上传', '图片', 'avatar'],
		fallbackId: 'avatar',
	},
	{ id: 'avatar-shape', category: 'general', label: '形状', keywords: ['头像', '外轮廓'], fallbackId: 'avatar' },
	{ id: 'avatar-color', category: 'general', label: '颜色', keywords: ['头像', '主体色'], fallbackId: 'avatar' },
	{ id: 'avatar-expression', category: 'general', label: '表情', keywords: ['头像', '面部'], fallbackId: 'avatar' },
	{
		id: 'theme',
		category: 'appearance',
		label: '主题',
		keywords: ['暗色', '浅色', '深色', 'light', 'dark'],
	},
	{ id: 'default-model', category: 'models', label: '默认模型', keywords: ['default', 'defaultModel'] },
	{ id: 'configured', category: 'models', label: '已配置', keywords: ['提供商'] },
	{
		id: 'builtin-provider',
		category: 'models',
		label: '提供商',
		keywords: ['内置提供商', '密钥'],
		fallbackId: 'builtin',
	},
	{
		id: 'api-key',
		category: 'models',
		label: 'API Key',
		keywords: ['密钥', '更换', '清除', '内置提供商'],
		fallbackId: 'builtin',
	},
	{
		id: 'refresh-models',
		category: 'models',
		label: '刷新模型列表',
		keywords: ['内置提供商'],
		fallbackId: 'builtin',
	},
	{
		id: 'custom-provider',
		category: 'models',
		label: '自定义',
		keywords: ['内置提供商'],
		fallbackId: 'builtin',
	},
	{
		id: 'send-while-busy',
		category: 'agents',
		label: '对话中发送',
		keywords: ['发送', 'sendWhileBusy', '进入队列', '打断并发送', '打断'],
	},
	{
		id: 'follow-up',
		category: 'agents',
		label: '队列出队',
		keywords: ['发送', 'followUpMode', '出队', '一次一条', '一次全部'],
	},
	{
		id: 'abort-queue',
		category: 'agents',
		label: '停止',
		keywords: ['发送', 'abortQueue', '发出队列', '清空队列'],
	},
	{
		id: 'session-delete',
		category: 'agents',
		label: '会话',
		keywords: ['删除', 'sessionDelete', '逻辑删除', '物理删除'],
	},
	{
		id: 'project-delete',
		category: 'agents',
		label: '项目',
		keywords: ['删除', 'projectDelete', '逻辑删除', '物理删除'],
	},
] as const satisfies readonly SettingEntry[]

export type SettingEntryRecord = (typeof SETTING_ENTRIES)[number]
export type SettingEntryId = SettingEntryRecord['id']
export type SettingAnchorId = SettingEntryId | SettingGroupId

export type SettingFocus = {
	id: SettingEntryId
	nonce: number
}

export type SettingPanelProps = {
	focus: SettingFocus | null
}

export const SETTING_CATEGORY_LABEL: Record<SettingCategory, string> = {
	general: '通用',
	appearance: '外观',
	models: '模型',
	agents: '代理',
}

/** Empty query returns nothing. Otherwise trim + lowercase substring on the category name, row label, and keywords. */
export function searchSettings(query: string): SettingEntryRecord[] {
	const needle = query.trim().toLowerCase()
	if (!needle) return []
	return SETTING_ENTRIES.filter((entry) => {
		const parts = [SETTING_CATEGORY_LABEL[entry.category], entry.label, ...entry.keywords]
		return parts.some((part) => part.toLowerCase().includes(needle))
	})
}

export function scrollToSetting(id: SettingAnchorId, fallbackId?: SettingGroupId): boolean {
	const node =
		document.querySelector(`[data-setting-id="${id}"]`) ??
		(fallbackId ? document.querySelector(`[data-setting-id="${fallbackId}"]`) : null)
	if (!(node instanceof HTMLElement)) return false
	node.scrollIntoView({ block: 'center', behavior: 'smooth' })
	return true
}
