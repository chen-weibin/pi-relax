import { sourcePlugin } from './source'

/** 视图只消费这份汇总。新扩展在自己的目录里写完，再并到这里。 */
export const markdownPlugins = {
	remarkPlugins: [...sourcePlugin.remarkPlugins],
	allowedTags: { ...sourcePlugin.allowedTags },
	components: { ...sourcePlugin.components },
}
