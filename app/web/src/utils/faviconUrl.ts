/** 页面地址对应的源站 `/favicon.ico`。非法 URL 返回 `null`。 */
export function faviconUrl(pageUrl: string): string | null {
	try {
		return new URL('/favicon.ico', pageUrl).href
	} catch {
		return null
	}
}
