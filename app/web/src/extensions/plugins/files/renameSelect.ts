/** Exclusive end index of the name to select when entering rename. */
export function renameSelectEnd(name: string, kind: 'file' | 'dir'): number {
	if (kind === 'dir') return name.length
	let i = 0
	while (i < name.length && name[i] === '.') i += 1
	if (i >= name.length) return name.length
	const lastDot = name.lastIndexOf('.')
	if (lastDot <= i) return name.length
	return lastDot
}
