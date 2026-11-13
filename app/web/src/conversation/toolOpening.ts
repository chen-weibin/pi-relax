/** 专属工具行开头那几个字。活动行用同一份。没登记的仍用工具名。 */
const OPENING: Record<string, string> = {
	bash: '运行',
	powershell: '运行',
	ls: '查看资源',
	read: '查看文件',
	write: '编辑',
	edit: '编辑',
}

export function toolOpeningTitle(name: string): string {
	return OPENING[name] ?? (name || '工具')
}
