import { createContext, useContext, type ReactNode } from 'react'

export type SourceClick = (source: { name: string; url: string }) => void

export type SourceOptions = {
	/** 点击是否在新标签打开 URL。默认是。传入 `onClick` 后不再打开。 */
	openInNewTab?: boolean
	/** 自行处理点击。传入后不再自动打开 URL。 */
	onClick?: SourceClick
}

const empty: SourceOptions = {}
const SourceOptionsContext = createContext<SourceOptions>(empty)

export function SourceOptionsProvider({ options, children }: { options?: SourceOptions; children: ReactNode }) {
	return <SourceOptionsContext.Provider value={options ?? empty}>{children}</SourceOptionsContext.Provider>
}

export function useSourceOptions(): SourceOptions {
	return useContext(SourceOptionsContext)
}
