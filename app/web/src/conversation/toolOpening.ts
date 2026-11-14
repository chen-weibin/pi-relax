/** 专属工具行开头那几个字。活动行用同一份。没登记的仍用工具名。 */
const OPENING: Record<string, string> = {
	bash: '运行',
	powershell: '运行',
	ls: '查看资源',
	read: '查看文件',
	write: '编辑',
	edit: '编辑',
	find: '搜索文件',
	grep: '搜索内容',
	codemode: '编排',
	web_search: '搜索网络',
	fetch_content: '抓取网页',
	get_search_content: '读取存档',
	source_check: '核查',
}

export function toolOpeningTitle(name: string): string {
	return OPENING[name] ?? (name || '工具')
}
