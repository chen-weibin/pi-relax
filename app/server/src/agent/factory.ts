import { createRequire } from 'node:module'
import type { Model } from '@earendil-works/pi-ai'
import {
	createAgentSessionFromServices,
	createAgentSessionRuntime,
	createAgentSessionServices,
	type CreateAgentSessionRuntimeFactory,
	type SessionManager,
} from '@earendil-works/pi-coding-agent'
import { getRelaxAgentDir } from '../config/home.js'
import { extensionFactories } from '../extensions/index.js'
import { DEFAULT_THINKING_LEVEL, modelRuntime } from './models.js'

const require = createRequire(import.meta.url)
// 官方包没有 main / exports，只有 src/index.ts。交给基座的 jiti 加载，避免 tsc 编它的源码。
const langfuseExtensionPath = require.resolve('@langfuse/pi-observability-plugin/src/index.ts')
// 发布包的 pi.extensions 指向 ./dist。用编好的入口，不走源码 jiti。
const webAccessExtensionPath = require.resolve('pi-web-access/dist/index.js')

/** 替换式白名单。不在名单里的扩展工具不会激活。模式以后再按这份名单切换。 */
export const ACTIVE_TOOLS = [
	'read',
	'bash',
	'edit',
	'write',
	'grep',
	'find',
	'ls',
	'powershell',
	'codemode',
	'web_search',
	'fetch_content',
	'get_search_content',
	'source_check',
]

export type RuntimeFactory = (input: {
	cwd: string
	sessionManager: SessionManager
	/** 新建会话传入。打开旧会话省略，让基座从 JSONL 的 model_change 恢复。 */
	model?: Model<any>
}) => Promise<{ session: import('@earendil-works/pi-coding-agent').AgentSession }>

const pendingModels = new WeakMap<SessionManager, Model<any>>()

async function piFactory(): Promise<CreateAgentSessionRuntimeFactory> {
	return async ({ cwd, agentDir, sessionManager, sessionStartEvent }) => {
		const shared = await modelRuntime()
		const model = pendingModels.get(sessionManager)
		pendingModels.delete(sessionManager)
		const services = await createAgentSessionServices({
			cwd,
			agentDir,
			modelRuntime: shared,
			resourceLoaderOptions: {
				// 磁盘扩展仍不扫。noExtensions 仍会加载 additionalExtensionPaths。
				// 密钥读进程环境变量。LANGFUSE_TRACING_ENABLED=false 时插件自己不上报。
				noExtensions: true,
				additionalExtensionPaths: [langfuseExtensionPath, webAccessExtensionPath],
				extensionFactories,
				noSkills: true,
				noPromptTemplates: true,
				noThemes: true,
				noContextFiles: true,
			},
		})
		// 出队模式不在这里设。新建会话由基座 SettingsManager 从 ~/.relax/agent/settings.json 读入，
		// 项目 .pi/settings.json 可盖过。改全局配置时 Agent.applyQueueModes 再套到热会话。
		const created = await createAgentSessionFromServices({
			services,
			sessionManager,
			sessionStartEvent,
			...(model ? { model } : {}),
			thinkingLevel: DEFAULT_THINKING_LEVEL,
			tools: ACTIVE_TOOLS,
		})
		return {
			...created,
			services,
			diagnostics: services.diagnostics,
		}
	}
}

export async function createPiRuntime(input: {
	cwd: string
	sessionManager: SessionManager
	model?: Model<any>
}): Promise<{ session: import('@earendil-works/pi-coding-agent').AgentSession }> {
	if (input.model) pendingModels.set(input.sessionManager, input.model)
	const factory = await piFactory()
	const runtime = await createAgentSessionRuntime(factory, {
		cwd: input.cwd,
		agentDir: getRelaxAgentDir(),
		sessionManager: input.sessionManager,
	})
	return runtime
}
