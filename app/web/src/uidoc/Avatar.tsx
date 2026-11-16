import { useState } from 'react'
import {
	Avatar,
	avatarPalettes,
	avatarSizes,
	EXPRESSIONS,
	FACE_SIZES,
	SHAPES,
	type AvatarColors,
	type AvatarExpression,
	type AvatarFaceSize,
	type AvatarShape,
	type AvatarSize,
} from '../ui/Avatar'
import { ColorSwatch, DEFAULT_SWATCH_COLORS } from '../ui/ColorSwatch'
import { Segmented } from '../ui/Segmented'
import { Preview } from './frame'

const sizes = Object.keys(avatarSizes) as AvatarSize[]
const shapes = Object.keys(SHAPES) as AvatarShape[]
const expressions = Object.keys(EXPRESSIONS) as AvatarExpression[]
const faceSizes = Object.keys(FACE_SIZES) as AvatarFaceSize[]

function colorsFromBody(body: string): AvatarColors {
	const match = avatarPalettes.find((p) => p.colors.body.toLowerCase() === body.toLowerCase())
	if (match) return match.colors
	return { body, face: '#1c1c20', outline: '#0b0b0d', background: '#151515' }
}

function AvatarDemo() {
	const [size, setSize] = useState<AvatarSize>('md')
	const [shape, setShape] = useState<AvatarShape>('circle')
	const [expression, setExpression] = useState<AvatarExpression>('neutral')
	const [faceSize, setFaceSize] = useState<AvatarFaceSize>('small')
	const [body, setBody] = useState<string>(DEFAULT_SWATCH_COLORS[0]!)
	const colors = colorsFromBody(body)
	const paletteName =
		avatarPalettes.find((p) => p.colors.body.toLowerCase() === body.toLowerCase())?.name ?? '自定义'

	return (
		<div className="flex flex-col items-center gap-6">
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Segmented size="sm" value={size} options={sizes} onChange={setSize} />
				<Segmented size="sm" value={shape} options={shapes} onChange={setShape} />
				<Segmented size="sm" value={faceSize} options={faceSizes} onChange={setFaceSize} />
			</div>
			<div className="flex max-w-xl flex-wrap items-center justify-center gap-2">
				<Segmented size="sm" value={expression} options={expressions} onChange={setExpression} />
			</div>
			<ColorSwatch value={body} onChange={setBody} aria-label="头像色板" />
			<Preview
				label={`${shape} · ${expression} · ${faceSize} · ${paletteName} · ${avatarSizes[size]}px`}
			>
				<div
					className="grid place-items-center rounded-lg p-6"
					style={{ background: colors.background }}
				>
					<Avatar
						size={size}
						shape={shape}
						expression={expression}
						faceSize={faceSize}
						colors={colors}
						label="卡通头像示例"
					/>
				</div>
			</Preview>
			<div className="flex items-end justify-center gap-8">
				{sizes.map((preset) => (
					<Preview key={preset} label={`${preset} · ${avatarSizes[preset]}px`}>
						<Avatar size={preset} colors={avatarPalettes[0]!.colors} label={`${preset} 尺寸`} />
					</Preview>
				))}
			</div>
			<div className="flex flex-wrap items-end justify-center gap-6">
				{shapes.map((item) => (
					<Preview key={item} label={SHAPES[item].label}>
						<Avatar size={48} shape={item} colors={avatarPalettes[1]!.colors} label={SHAPES[item].label} />
					</Preview>
				))}
			</div>
		</div>
	)
}

export const avatarDoc = {
	id: 'avatar',
	heading: 'Avatar',
	description: '可配置卡通头像。形状、表情、五官尺寸、色板和循环动画都由 props 控制，纯 SVG，无 WebGL。',
	nav: ['Avatar'],
	Demo: AvatarDemo,
}
