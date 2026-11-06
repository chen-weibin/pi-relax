export interface CommandMap {}

export type CommandErrorCode = 'NOT_FOUND' | 'ASYNC' | 'DUPLICATE'

export class CommandError extends Error {
	readonly code: CommandErrorCode

	constructor(code: CommandErrorCode, message?: string) {
		super(message ?? code)
		this.name = 'CommandError'
		this.code = code
	}
}

export type CommandDisposable = { dispose(): void }

type CommandArgs<K extends keyof CommandMap> = CommandMap[K]['args'] extends void
	? []
	: Record<string, never> extends CommandMap[K]['args']
		? [CommandMap[K]['args']?]
		: [CommandMap[K]['args']]

type CommandResult<K extends keyof CommandMap> = CommandMap[K]['result']

type HandlerReturn<K extends keyof CommandMap> = CommandMap[K]['sync'] extends true
	? CommandResult<K>
	: CommandResult<K> | Promise<CommandResult<K>>

export type SyncCommandId = {
	[K in keyof CommandMap]: CommandMap[K]['sync'] extends true ? K : never
}[keyof CommandMap]

type StoredHandler = (args: unknown) => unknown

const handlers = new Map<string, StoredHandler>()

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { then?: unknown }).then === 'function'
	)
}

function readArg(args: readonly unknown[]): unknown {
	return args.length > 0 ? args[0] : undefined
}

function requireHandler(id: string): StoredHandler {
	const handler = handlers.get(id)
	if (!handler) throw new CommandError('NOT_FOUND', id)
	return handler
}

export function registerCommand<K extends keyof CommandMap, R extends HandlerReturn<K>>(
	id: K,
	handler: (
		...args: CommandArgs<K>
	) => CommandMap[K]['sync'] extends true ? ([R] extends [Promise<unknown>] ? never : R) : R,
): CommandDisposable {
	const key = String(id)
	if (handlers.has(key)) throw new CommandError('DUPLICATE', key)
	const stored: StoredHandler = (args) => (handler as unknown as (value: unknown) => R)(args)
	handlers.set(key, stored)
	return {
		dispose() {
			if (handlers.get(key) === stored) handlers.delete(key)
		},
	}
}

export function executeCommand<K extends keyof CommandMap>(
	id: K,
	...args: CommandArgs<K>
): Promise<CommandResult<K>> {
	try {
		return Promise.resolve(requireHandler(String(id))(readArg(args))) as Promise<CommandResult<K>>
	} catch (error) {
		return Promise.reject(error)
	}
}

export function executeCommandSync<K extends SyncCommandId>(
	id: K,
	...args: CommandArgs<K>
): CommandResult<K> {
	const value = requireHandler(String(id))(readArg(args))
	if (isThenable(value)) throw new CommandError('ASYNC', String(id))
	return value as CommandResult<K>
}

export const commands = {
	registerCommand,
	executeCommand,
	executeCommandSync,
}

export type ExtensionCommands = typeof commands

export type ExtensionContext = {
	commands: ExtensionCommands
}
