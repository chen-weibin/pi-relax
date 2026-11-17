import type { ReactNode } from 'react'
import type { SettingAnchorId } from './settingSearch'

/** Marks a setting block so search can scroll to a catalog id. */
export function SettingAnchor({ id, children }: { id: SettingAnchorId; children: ReactNode }) {
	return <div data-setting-id={id}>{children}</div>
}

/** For a control that must itself be the scroll target, such as a header button. */
export function settingAnchorProps(id: SettingAnchorId) {
	return { 'data-setting-id': id } as const
}
