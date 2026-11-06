import { useCommonStore } from '../../../store/common'
import { CommandError, type ExtensionContext } from '../../commands'
import { pty } from '../../contracts/adapters/ptySocket'
import { currentExtensionCwd } from '../../sessionTabs'
import { useExtensionStore } from '../../store'
import { listOpenTerminals, shellInput, type TerminalSessionInfo } from './commandInput'
import { isTerminalPayload, type TerminalPayload } from './open'

declare module '../../commands.ts' {
	interface CommandMap {
		'terminal.open': {
			args: { cwd?: string }
			result: { sessionId: string; tabId: string }
			sync: false
		}
		'terminal.exec': {
			args: { sessionId: string; command: string }
			result: void
			sync: false
		}
		'terminal.list': {
			args: void
			result: TerminalSessionInfo[]
			sync: true
		}
	}
}

async function openTerminal(args?: { cwd?: string }) {
	const sessionId = crypto.randomUUID()
	const cwd = args?.cwd ?? currentExtensionCwd() ?? undefined
	await pty.create({ id: sessionId, cwd })
	useCommonStore.getState().setExtensionOpen(true)
	const tabId = useExtensionStore.getState().openTab({
		pluginId: 'terminal',
		title: '终端',
		reuseKey: `session:${sessionId}`,
		payload: { sessionId } satisfies TerminalPayload,
	})
	return { sessionId, tabId }
}

async function execInTerminal(args: { sessionId: string; command: string }) {
	const store = useExtensionStore.getState()
	const tab = store.tabs.find(
		(item) =>
			item.pluginId === 'terminal' &&
			isTerminalPayload(item.payload) &&
			item.payload.sessionId === args.sessionId,
	)
	if (!tab) throw new CommandError('NOT_FOUND', args.sessionId)
	useCommonStore.getState().setExtensionOpen(true)
	store.activateTab(tab.id)
	await pty.write(args.sessionId, shellInput(args.command))
}

function listTerminals() {
	const store = useExtensionStore.getState()
	return listOpenTerminals(store.tabs, store.activeTabId)
}

export function activateTerminal(ctx: ExtensionContext) {
	return [
		ctx.commands.registerCommand('terminal.open', openTerminal),
		ctx.commands.registerCommand('terminal.exec', execInTerminal),
		ctx.commands.registerCommand('terminal.list', listTerminals),
	]
}
