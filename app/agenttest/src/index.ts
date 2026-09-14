import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";
import { model, modelRuntime } from "./model"


const workspaceDir = '/Users/chen/Desktop/chen/pi/app/agenttest/src/workspace';

const loader = new DefaultResourceLoader({
	cwd: workspaceDir,
	agentDir: workspaceDir,
	//    覆盖系统提示词。basePrompt空的，不知道为什么  少用，连工具哪些提示词好像也没了
	//   systemPromptOverride: (basePrompt) => {
	// 	console.log(basePrompt);
	// 	return "You are a helpful assistant."
	//   },
	// basePrompt也是空的  加载结尾。可以使用这个
	// appendSystemPromptOverride: (basePrompt) => {
	// 	console.log(basePrompt);
	// 	return ['hahah'];
	// },
	// 避免向上递归，自己过滤
	agentsFilesOverride: (base) => {
		// console.log(base);
		return {
			agentsFiles: base.agentsFiles.filter(({ path, content }) => path.startsWith(workspaceDir) && content.trim())
		};
	},
});

await loader.reload();

const { session } = await createAgentSession({
	model,
	modelRuntime,
	noTools: 'builtin',
	thinkingLevel: "off",
	sessionManager: SessionManager.inMemory(),
	// 会向上搜索 https://pi.dev/docs/latest/sdk#options-reference
	// cwd: process.cwd(),
	// 改成这个，但是还是会向上搜索
	cwd: workspaceDir,
	agentDir: workspaceDir,
	// 自定义资源加载器 比如系统提示词，更多的自定义
	resourceLoader: loader,
})

session.subscribe((event) => {
	// console.log(JSON.stringify(event, null, 4))
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
});

async function main() {
	// 执行文件的路径  /Users/chen/Desktop/chen/pi/app/agenttest/src
	// console.log(process.cwd());

	console.log('---系统提示词---')
	console.log(session.systemPrompt);
	console.log('---state-----')
	const state = session.agent.state;
	// console.log(state.systemPrompt);
	// console.log(state.model);
	// console.log(state.tools);
	// await session.prompt("你有哪些可用的工具");
}

main()