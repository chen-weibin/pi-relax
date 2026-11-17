import { useEffect, useState } from 'react'
import {
	getSettings,
	patchSettings,
	type AbortQueue,
	type DeleteMode,
	type QueueMode,
	type RuntimeSettings,
	type SendWhileBusy,
	type SettingsPatch,
} from '../../api/settings'
import { noteRuntimeSettings } from '../../session/runtimeSettings'
import { message } from '../../ui/Message'
import { Select, type SelectOption } from '../../ui/Select'
import { SettingGroup } from '../../ui/SettingGroup'
import { SettingRow } from '../../ui/SettingRow'

const SEND_OPTIONS: SelectOption<SendWhileBusy>[] = [
	{ value: 'queue', label: '进入队列' },
	{ value: 'interrupt', label: '打断并发送' },
]

const DRAIN_OPTIONS: SelectOption<QueueMode>[] = [
	{ value: 'one-at-a-time', label: '一次一条' },
	{ value: 'all', label: '一次全部' },
]

const ABORT_OPTIONS: SelectOption<AbortQueue>[] = [
	{ value: 'deliver', label: '发出队列' },
	{ value: 'clear', label: '清空队列' },
]

const DELETE_OPTIONS: SelectOption<DeleteMode>[] = [
	{ value: 'logical', label: '逻辑删除' },
	{ value: 'physical', label: '物理删除' },
]

export function Agents() {
	const [settings, setSettings] = useState<RuntimeSettings | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [busyKey, setBusyKey] = useState<keyof SettingsPatch | null>(null)

	useEffect(() => {
		let cancelled = false
		void getSettings()
			.then((next) => {
				if (cancelled) return
				noteRuntimeSettings(next)
				setSettings(next)
			})
			.catch((error: unknown) => {
				if (cancelled) return
				setLoadError(error instanceof Error ? error.message : '加载失败')
			})
		return () => {
			cancelled = true
		}
	}, [])

	if (!settings) {
		return <div className="text-sm text-fg-3">{loadError ? `加载失败：${loadError}` : '加载中…'}</div>
	}

	async function change<K extends keyof SettingsPatch>(key: K, value: SettingsPatch[K]) {
		const previous = settings!
		if (previous[key] === value) return
		setSettings({ ...previous, [key]: value })
		setBusyKey(key)
		try {
			const saved = await patchSettings({ [key]: value })
			noteRuntimeSettings(saved)
			setSettings(saved)
		} catch (error) {
			setSettings(previous)
			message.error(error instanceof Error ? error.message : '保存失败')
		} finally {
			setBusyKey(null)
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<SettingGroup title="发送">
				<SettingRow label="对话中发送" description="正在生成时再发一条，排进队列，或停掉当前这次再发这条">
					<Select
						dropdownWidth={120}
						value={settings.sendWhileBusy}
						disabled={busyKey === 'sendWhileBusy'}
						options={SEND_OPTIONS}
						placement="bottom-end"
						onChange={(value) => void change('sendWhileBusy', value)}
					/>
				</SettingRow>
				<SettingRow label="队列出队" description="多条排队时，下一轮一次一条，或一次全部放进同一轮">
					<Select
						dropdownWidth={120}
						value={settings.followUpMode}
						disabled={busyKey === 'followUpMode'}
						options={DRAIN_OPTIONS}
						placement="bottom-end"
						onChange={(value) => void change('followUpMode', value)}
					/>
				</SettingRow>
				<SettingRow label="停止" description="没有队列就只停。有队列时，停完按出队方式发出去，或直接清空">
					<Select
						dropdownWidth={120}
						value={settings.abortQueue}
						disabled={busyKey === 'abortQueue'}
						options={ABORT_OPTIONS}
						placement="bottom-end"
						onChange={(value) => void change('abortQueue', value)}
					/>
				</SettingRow>
			</SettingGroup>
			<SettingGroup title="删除">
				<SettingRow label="会话" description="逻辑删除只做标记。物理删除会删掉这一份会话文件">
					<Select
						dropdownWidth={120}
						value={settings.sessionDelete}
						disabled={busyKey === 'sessionDelete'}
						options={DELETE_OPTIONS}
						placement="bottom-end"
						onChange={(value) => void change('sessionDelete', value)}
					/>
				</SettingRow>
				<SettingRow label="项目" description="只改项目登记，不删会话，也不删工作区目录">
					<Select
						dropdownWidth={120}
						value={settings.projectDelete}
						disabled={busyKey === 'projectDelete'}
						options={DELETE_OPTIONS}
						placement="bottom-end"
						onChange={(value) => void change('projectDelete', value)}
					/>
				</SettingRow>
			</SettingGroup>
		</div>
	)
}
