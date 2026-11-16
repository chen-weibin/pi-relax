import { FEATURE_DEFAULT, normalizeRing, ring, type FeatureParams, type Point } from './geometry.ts'

export type AvatarShape = 'circle' | 'blob' | 'roundedSquare'
export type AvatarExpression =
	| 'neutral'
	| 'happy'
	| 'thinking'
	| 'surprised'
	| 'sad'
	| 'wink'
	| 'sleepy'
	| 'excited'
export type AvatarFaceSize = 'small' | 'middle' | 'large'
export type AvatarSize = 'sm' | 'md' | 'lg'

export type AvatarColors = {
	body: string
	face: string
	outline: string
	background: string
}

export type AvatarConfig = {
	shape: AvatarShape
	expression: AvatarExpression
	faceSize: AvatarFaceSize
	colors: AvatarColors
	outline: { enabled: boolean; width: number }
	animation: { loop: boolean; speed: number; paused: boolean }
}

export type AvatarConfigPatch = {
	shape?: AvatarShape
	expression?: AvatarExpression
	faceSize?: AvatarFaceSize
	colors?: Partial<AvatarColors>
	outline?: Partial<AvatarConfig['outline']>
	animation?: Partial<AvatarConfig['animation']>
}

export type FaceAnchor = { y: number; scale: number; grow?: number }

export type ShapeDef = {
	label: string
	face: Record<AvatarFaceSize, FaceAnchor>
	outline: () => Point[]
}

export type BodyPose = { y: number; rx: number; ry: number; rz: number }

export type ExpressionDef = {
	label: string
	features: FeatureParams[]
	body?: Partial<BodyPose>
	loops: string[]
}

export type PoseState = {
	f: [FeatureParams, FeatureParams, FeatureParams]
	body: BodyPose & { sx: number; sy: number }
}

export type AnimationDef = {
	label: string
	run: (t: number, pose: PoseState, weight: number) => void
}

export const DEFAULT_CONFIG: AvatarConfig = {
	shape: 'circle',
	expression: 'neutral',
	faceSize: 'small',
	colors: { body: '#f4f4f1', face: '#1c1c20', outline: '#0b0b0d', background: '#151515' },
	outline: { enabled: false, width: 0.05 },
	animation: { loop: true, speed: 1, paused: false },
}

export const avatarPalettes = [
	{ name: '经典', colors: { body: '#f4f4f1', face: '#1c1c20', outline: '#0b0b0d', background: '#151515' } },
	{ name: '薄荷', colors: { body: '#c4f0d8', face: '#123527', outline: '#0a1d15', background: '#0f1a15' } },
	{ name: '蜜桃', colors: { body: '#ffd6bf', face: '#3b1f14', outline: '#20110a', background: '#1b1411' } },
	{ name: '丁香', colors: { body: '#dcd4ff', face: '#241b4d', outline: '#120d29', background: '#14121d' } },
	{ name: '天空', colors: { body: '#cbe6ff', face: '#0f2a45', outline: '#081626', background: '#0f151d' } },
	{ name: '柠檬', colors: { body: '#fff1a6', face: '#2e2a10', outline: '#181507', background: '#181712' } },
	{ name: '夜', colors: { body: '#2c2c2e', face: '#f2f2f2', outline: '#000000', background: '#0d0d0d' } },
] as const

export const FACE_SIZES: Record<AvatarFaceSize, string> = {
	small: '小',
	middle: '中',
	large: '大',
}

export const SHAPES: Record<AvatarShape, ShapeDef> = {
	circle: {
		label: '圆形',
		face: {
			small: { y: 0, scale: 1 },
			middle: { y: 0, scale: 1.3 },
			large: { y: 0.04, scale: 1.3, grow: 1.14 },
		},
		outline: () => ring(() => 1),
	},
	blob: {
		label: 'Blob',
		face: {
			small: { y: 0.03, scale: 0.94 },
			middle: { y: 0.03, scale: 1.22 },
			large: { y: 0.02, scale: 1.22, grow: 1.16 },
		},
		outline: () =>
			normalizeRing(
				ring(
					(a) =>
						1 + 0.04 * Math.sin(3 * a + 0.6) + 0.025 * Math.sin(2 * a - 0.9) + 0.01 * Math.sin(5 * a + 2.1),
				),
			),
	},
	roundedSquare: {
		label: '大圆角方形',
		face: {
			small: { y: 0, scale: 1.04 },
			middle: { y: 0.04, scale: 1.25 },
			large: { y: 0.09, scale: 1.25, grow: 1.2 },
		},
		outline: () =>
			ring((a) => 0.93 * Math.pow(Math.abs(Math.cos(a)) ** 4.2 + Math.abs(Math.sin(a)) ** 4.2, -1 / 4.2)),
	},
}

const feat = (o: Partial<FeatureParams> & { x?: number }): FeatureParams => ({ ...FEATURE_DEFAULT, ...o })
const sym = (o: Partial<FeatureParams> & { x: number }, shift = 0): [FeatureParams, FeatureParams] => [
	feat({ ...o, x: -o.x + shift, rot: -(o.rot || 0) }),
	feat({ ...o, x: o.x + shift }),
]
const OVAL = { x: 0.3, y: 0.07, w: 0.16, thick: 0.125 }
const ARC_UP = { x: 0.3, y: 0.09, w: 0.28, bend: 0.1, thick: 0.045 }

export const EXPRESSIONS: Record<AvatarExpression, ExpressionDef> = {
	neutral: {
		label: '默认',
		features: [...sym(OVAL), feat({ y: -0.25, w: 0.2, bend: -0.04, thick: 0.037 })],
		loops: ['blink', 'breathe'],
	},
	happy: {
		label: '开心',
		features: [...sym(ARC_UP), feat({ y: -0.21, w: 0.34, bend: -0.12, thick: 0.043 })],
		loops: ['breathe', 'sway'],
	},
	thinking: {
		label: '思考',
		features: [
			...sym({ ...OVAL, y: 0.12, w: 0.14, thick: 0.11 }, 0.07),
			feat({ x: 0.1, y: -0.26, w: 0.16, bend: 0.014, thick: 0.037, rot: 0.18 }),
		],
		body: { rz: 0.08 },
		loops: ['blink', 'ponder'],
	},
	surprised: {
		label: '惊讶',
		features: [...sym({ ...OVAL, y: 0.11, w: 0.19, thick: 0.15 }), feat({ y: -0.29, w: 0.16, thick: 0.1 })],
		body: { y: 0.03 },
		loops: ['blink', 'breathe'],
	},
	sad: {
		label: '难过',
		features: [
			...sym({ ...OVAL, y: 0.02, w: 0.15, thick: 0.1 }),
			feat({ y: -0.29, w: 0.24, bend: 0.065, thick: 0.037 }),
		],
		body: { y: -0.04, rx: 0.12 },
		loops: ['blink', 'droop'],
	},
	wink: {
		label: '眨眼',
		features: [
			feat({ ...OVAL, x: -0.3 }),
			feat({ ...ARC_UP, y: 0.08, w: 0.26 }),
			feat({ x: 0.03, y: -0.23, w: 0.3, bend: -0.09, thick: 0.041 }),
		],
		body: { rz: -0.07 },
		loops: ['breathe', 'sway'],
	},
	sleepy: {
		label: '困倦',
		features: [
			...sym({ x: 0.3, y: 0.04, w: 0.26, bend: -0.05, thick: 0.04 }),
			feat({ y: -0.27, w: 0.1, thick: 0.055 }),
		],
		body: { rx: 0.1, rz: 0.05 },
		loops: ['doze'],
	},
	excited: {
		label: '兴奋',
		features: [
			...sym({ ...OVAL, y: 0.1, w: 0.18, thick: 0.145 }),
			feat({ y: -0.2, w: 0.38, bend: -0.05, thick: 0.04, bulge: 0.2, lift: -1 }),
		],
		loops: ['blink', 'bounce'],
	},
}

const hash = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
	return x - Math.floor(x)
}

function blinkAmount(t: number) {
	const P = 3.6
	const k = Math.floor(t / P)
	const d = t - k * P - (0.4 + hash(k) * 1.8)
	const pulse = (x: number) => (x > 0 && x < 0.17 ? Math.sin((Math.PI * x) / 0.17) : 0)
	return Math.max(pulse(d), hash(k + 9) > 0.72 ? pulse(d - 0.3) : 0)
}

const eyesOf = (pose: PoseState): FeatureParams[] => [pose.f[0], pose.f[1]]

export const ANIMATIONS: Record<string, AnimationDef> = {
	blink: {
		label: '眨眼',
		run: (t, p, w) => {
			const b = blinkAmount(t) * w
			for (const e of eyesOf(p)) {
				e.thick *= 1 - 0.85 * b
				e.w *= 1 + 0.12 * b
			}
		},
	},
	breathe: {
		label: '呼吸',
		run: (t, p, w) => {
			const s = Math.sin((t * Math.PI * 2) / 3.8) * w
			p.body.sy *= 1 + 0.016 * s
			p.body.sx *= 1 - 0.008 * s
			p.body.y += 0.012 * s
		},
	},
	sway: {
		label: '摇摆',
		run: (t, p, w) => {
			p.body.rz += 0.045 * Math.sin(t * 1.9) * w
			p.body.y += 0.014 * Math.sin(t * 3.8) * w
		},
	},
	ponder: {
		label: '思索',
		run: (t, p, w) => {
			const gx = (Math.sin(t * 0.8) * 0.6 + Math.sin(t * 1.7) * 0.4) * w
			const gy = Math.sin(t * 0.55 + 1) * w
			for (const e of eyesOf(p)) {
				e.x += 0.035 * gx
				e.y += 0.018 * gy
			}
			p.f[2].x += 0.012 * gx
			p.body.ry += 0.08 * gx
			p.body.rz += 0.035 * Math.sin(t * 0.5) * w
		},
	},
	bounce: {
		label: '弹跳',
		run: (t, p, w) => {
			const hop = Math.sin(Math.PI * ((t * 1.7) % 1))
			const land = Math.max(0, 1 - hop * 4) ** 2
			p.body.y += 0.1 * hop * w
			p.body.sy *= 1 - 0.06 * land * w
			p.body.sx *= 1 + 0.04 * land * w
			p.f[2].bulge *= 1 + 0.12 * hop * w
		},
	},
	doze: {
		label: '打盹',
		run: (t, p, w) => {
			const s = Math.sin((t * Math.PI * 2) / 5.2)
			const open = Math.max(0, s) * w
			p.body.rx += 0.07 * s * w
			p.body.sy *= 1 + 0.02 * s * w
			p.f[2].thick *= 1 + 0.35 * open
			p.f[2].w *= 1 + 0.25 * open
		},
	},
	droop: {
		label: '低落',
		run: (t, p, w) => {
			p.body.y += 0.01 * Math.sin(t * 1.1) * w
			p.body.rz += 0.025 * Math.sin(t * 0.6) * w
			p.f[2].bend += 0.008 * Math.sin(t * 1.1) * w
		},
	},
}

export const BODY_POSE: BodyPose = { y: 0, rx: 0, ry: 0, rz: 0 }

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

export const clamp = (v: unknown, lo: number, hi: number, fallback: number): number =>
	Number.isFinite(+v!) ? Math.min(hi, Math.max(lo, +v!)) : fallback

export function mergeConfig(prev: AvatarConfig, patch: AvatarConfigPatch = {}): AvatarConfig {
	const next: AvatarConfig = {
		shape: patch.shape && SHAPES[patch.shape] ? patch.shape : prev.shape,
		expression: patch.expression && EXPRESSIONS[patch.expression] ? patch.expression : prev.expression,
		faceSize: patch.faceSize && FACE_SIZES[patch.faceSize] ? patch.faceSize : prev.faceSize,
		colors: { ...prev.colors },
		outline: {
			enabled: typeof patch.outline?.enabled === 'boolean' ? patch.outline.enabled : prev.outline.enabled,
			width: clamp(patch.outline?.width ?? prev.outline.width, 0, 0.15, prev.outline.width),
		},
		animation: {
			loop: typeof patch.animation?.loop === 'boolean' ? patch.animation.loop : prev.animation.loop,
			paused: typeof patch.animation?.paused === 'boolean' ? patch.animation.paused : prev.animation.paused,
			speed: clamp(patch.animation?.speed ?? prev.animation.speed, 0, 3, prev.animation.speed),
		},
	}
	for (const [k, v] of Object.entries(patch.colors || {})) {
		if (k in next.colors && isHex(v)) next.colors[k as keyof AvatarColors] = v.toLowerCase()
	}
	return next
}
