import { useEffect } from 'react'
import {
	SETTING_ENTRIES,
	scrollToSetting,
	type SettingCategory,
	type SettingFocus,
} from './settingSearch'

export function useSettingScroll(category: SettingCategory, focus: SettingFocus | null, ready: boolean) {
	useEffect(() => {
		if (!focus || !ready) return
		const entry = SETTING_ENTRIES.find((item) => item.id === focus.id)
		if (!entry || entry.category !== category) return
		scrollToSetting(entry.id, 'fallbackId' in entry ? entry.fallbackId : undefined)
	}, [category, focus, ready])
}
