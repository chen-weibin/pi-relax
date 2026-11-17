import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { avatarImageUrl } from '../../api/profile'
import { useProfileStore } from '../../store'
import {
	Avatar,
	colorsFromBody,
	EXPRESSIONS,
	SHAPES,
	type AvatarExpression,
	type AvatarShape,
} from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { ColorSwatch } from '../../ui/ColorSwatch'
import { Input } from '../../ui/Input'
import { message } from '../../ui/Message'
import { Segmented } from '../../ui/Segmented'
import { SettingGroup } from '../../ui/SettingGroup'
import { SettingRow } from '../../ui/SettingRow'
import { SettingAnchor } from './SettingAnchor'
import { type SettingPanelProps } from './settingSearch'
import { useSettingScroll } from './useSettingScroll'

const MODE_OPTIONS = ['内置', '图片'] as const
type AvatarModeUi = (typeof MODE_OPTIONS)[number]

const SHAPE_KEYS = Object.keys(SHAPES) as AvatarShape[]
const SHAPE_OPTIONS = SHAPE_KEYS.map((key) => SHAPES[key].label)
const SHAPE_BY_LABEL = Object.fromEntries(SHAPE_KEYS.map((key) => [SHAPES[key].label, key])) as Record<
	string,
	AvatarShape
>

const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as AvatarExpression[]
const EXPRESSION_OPTIONS = EXPRESSION_KEYS.map((key) => EXPRESSIONS[key].label)
const EXPRESSION_BY_LABEL = Object.fromEntries(
	EXPRESSION_KEYS.map((key) => [EXPRESSIONS[key].label, key]),
) as Record<string, AvatarExpression>

function modeFromProfile(mode: 'generated' | 'custom'): AvatarModeUi {
	return mode === 'custom' ? '图片' : '内置'
}

function mimeOf(file: File): string | undefined {
	if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp') return file.type
	return undefined
}

export function General({ focus }: SettingPanelProps) {
	const {
		profile,
		loadError,
		loadProfile,
		setDisplayName,
		setGeneratedAvatar,
		uploadAvatar,
		clearCustomAvatar,
	} = useProfileStore(
		useShallow((s) => ({
			profile: s.profile,
			loadError: s.loadError,
			loadProfile: s.loadProfile,
			setDisplayName: s.setDisplayName,
			setGeneratedAvatar: s.setGeneratedAvatar,
			uploadAvatar: s.uploadAvatar,
			clearCustomAvatar: s.clearCustomAvatar,
		})),
	)
	const [nameDraft, setNameDraft] = useState('')
	const [editingName, setEditingName] = useState(false)
	const [source, setSource] = useState<AvatarModeUi>('内置')
	const [busy, setBusy] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)
	const nameInputWrapRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		void loadProfile()
	}, [loadProfile])

	useEffect(() => {
		if (profile && !editingName) setNameDraft(profile.displayName)
	}, [profile?.displayName, editingName])

	useEffect(() => {
		if (profile) setSource(modeFromProfile(profile.avatar.mode))
	}, [profile?.avatar.mode])

	useEffect(() => {
		if (!editingName) return
		const input = nameInputWrapRef.current?.querySelector('input')
		input?.focus()
		input?.select()
	}, [editingName])

	useSettingScroll('general', focus, profile != null)

	if (!profile) {
		return (
			<div className="text-sm text-fg-3">
				{loadError ? `加载失败：${loadError}` : '加载中…'}
			</div>
		)
	}

	const generated =
		profile.avatar.mode === 'generated'
			? profile.avatar
			: { shape: 'circle' as const, expression: 'neutral' as const, color: '#f4f4f1' }

	async function commitName() {
		const next = nameDraft.trim()
		setEditingName(false)
		if (!next || next === profile!.displayName) {
			setNameDraft(profile!.displayName)
			return
		}
		try {
			setBusy(true)
			await setDisplayName(next)
		} catch (err) {
			message.error(err instanceof Error ? err.message : '保存用户名失败')
			setNameDraft(profile!.displayName)
		} finally {
			setBusy(false)
		}
	}

	async function patchGenerated(patch: {
		shape?: AvatarShape
		expression?: AvatarExpression
		color?: string
	}) {
		try {
			setBusy(true)
			await setGeneratedAvatar(patch)
		} catch (err) {
			message.error(err instanceof Error ? err.message : '保存头像失败')
		} finally {
			setBusy(false)
		}
	}

	async function onModeChange(next: AvatarModeUi) {
		if (next === source) return
		if (next === '图片') {
			setSource('图片')
			return
		}
		if (profile?.avatar.mode !== 'custom') {
			setSource('内置')
			return
		}
		try {
			setBusy(true)
			await clearCustomAvatar()
			setSource('内置')
		} catch (err) {
			message.error(err instanceof Error ? err.message : '恢复默认头像失败')
		} finally {
			setBusy(false)
		}
	}

	async function onFileChange(file: File | undefined) {
		if (!file) return
		const mime = mimeOf(file)
		if (!mime) {
			message.error('仅支持 PNG、JPEG、WebP')
			return
		}
		try {
			setBusy(true)
			await uploadAvatar(file, mime)
		} catch (err) {
			message.error(err instanceof Error ? err.message : '上传头像失败')
		} finally {
			setBusy(false)
			if (fileRef.current) fileRef.current.value = ''
		}
	}

	return (
		<section className="flex flex-col gap-6">
			<input
				ref={fileRef}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				className="hidden"
				onChange={(e) => void onFileChange(e.target.files?.[0])}
			/>

			<SettingAnchor id="display-name">
			<SettingGroup>
				<div className="flex items-center gap-3">
					{profile.avatar.mode === 'custom' ? (
						<img
							src={avatarImageUrl(profile.avatar.url)}
							alt=""
							className="h-10 w-10 shrink-0 rounded-full object-cover"
						/>
					) : (
						<Avatar
							size={36}
							shape={generated.shape}
							expression={generated.expression}
							colors={{ ...colorsFromBody(generated.color), background: 'transparent' }}
							label={profile.displayName}
						/>
					)}
					{editingName ? (
						<div ref={nameInputWrapRef} className="min-w-0 flex-1 max-w-xs">
							<Input
								value={nameDraft}
								maxLength={64}
								disabled={busy}
								variant="transparent"
								onChange={setNameDraft}
								onBlur={() => void commitName()}
								onPressEnter={() => void commitName()}
								onKeyDown={(e) => {
									if (e.key === 'Escape') {
										e.preventDefault()
										setNameDraft(profile.displayName)
										setEditingName(false)
									}
								}}
							/>
						</div>
					) : (
						<span
							className="min-w-0 truncate text-md text-fg cursor-text select-none"
							title="双击编辑"
							onDoubleClick={() => {
								if (busy) return
								setNameDraft(profile.displayName)
								setEditingName(true)
							}}
						>
							{profile.displayName}
						</span>
					)}
				</div>
			</SettingGroup>
			</SettingAnchor>

			<SettingAnchor id="avatar">
			<SettingGroup title="头像设置">
				<SettingAnchor id="avatar-source">
				<SettingRow label="来源" description="内置卡通头像，或上传自定义图片">
					<div className="flex items-center gap-2">
						<Segmented
							size="sm"
							variant="surface"
							value={source}
							options={[...MODE_OPTIONS]}
							onChange={(v) => void onModeChange(v)}
							disabled={busy}
						/>
						{source === '图片' ? (
							<Button
								size="sm"
								variant="solid"
								tone="inverse"
								disabled={busy}
								onClick={() => fileRef.current?.click()}
							>
								上传头像
							</Button>
						) : null}
					</div>
				</SettingRow>
				</SettingAnchor>

				{source === '内置' ? (
					<SettingAnchor id="avatar-shape">
					<SettingRow label="形状" description="头像外轮廓">
						<Segmented
							size="sm"
							variant="surface"
							value={SHAPES[generated.shape].label}
							options={SHAPE_OPTIONS}
							disabled={busy}
							onChange={(label) => {
								const shape = SHAPE_BY_LABEL[label]
								if (shape) void patchGenerated({ shape })
							}}
						/>
					</SettingRow>
					</SettingAnchor>
				) : null}

				{source === '内置' ? (
					<SettingAnchor id="avatar-color">
					<SettingRow label="颜色" description="头像主体色">
						<ColorSwatch
							value={generated.color}
							custom
							disabled={busy}
							onChange={(color) => void patchGenerated({ color })}
							aria-label="头像颜色"
						/>
					</SettingRow>
					</SettingAnchor>
				) : null}

				{source === '内置' ? (
					<SettingAnchor id="avatar-expression">
					<SettingRow label="表情" description="头像面部表情">
						<Segmented
							size="sm"
							variant="surface"
							value={EXPRESSIONS[generated.expression].label}
							options={EXPRESSION_OPTIONS}
							disabled={busy}
							onChange={(label) => {
								const expression = EXPRESSION_BY_LABEL[label]
								if (expression) void patchGenerated({ expression })
							}}
						/>
					</SettingRow>
					</SettingAnchor>
				) : null}

			</SettingGroup>
			</SettingAnchor>
		</section>
	)
}
