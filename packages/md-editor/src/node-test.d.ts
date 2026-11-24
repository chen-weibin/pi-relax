declare module 'node:assert/strict' {
	interface Assert {
		equal(actual: unknown, expected: unknown, message?: string): void
		deepEqual(actual: unknown, expected: unknown, message?: string): void
		ok(value: unknown, message?: string): asserts value
	}
	const assert: Assert
	export default assert
}

declare module 'node:test' {
	export function describe(name: string, fn: () => void): void
	export function it(name: string, fn: () => void | Promise<void>): void
}
