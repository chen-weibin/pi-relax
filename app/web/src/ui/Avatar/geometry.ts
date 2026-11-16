export type Point = { x: number; y: number }

export type FeatureParams = {
	x: number
	y: number
	w: number
	bend: number
	thick: number
	bulge: number
	lift: number
	rot: number
}

export const FEATURE_KEYS = ['x', 'y', 'w', 'bend', 'thick', 'bulge', 'lift', 'rot'] as const
export const FEATURE_DEFAULT: FeatureParams = {
	x: 0,
	y: 0,
	w: 0.2,
	bend: 0,
	thick: 0.03,
	bulge: 0,
	lift: 0,
	rot: 0,
}
export const FN = 48

const SEG = 180
const GROW_KEYS = ['w', 'bend', 'thick', 'bulge'] as const

export const ring = (radius: (a: number) => number): Point[] =>
	Array.from({ length: SEG }, (_, i) => {
		const a = (i / SEG) * Math.PI * 2
		const r = radius(a)
		return { x: Math.cos(a) * r, y: Math.sin(a) * r }
	})

export const normalizeRing = (pts: Point[]): Point[] => {
	const m = Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))
	return pts.map((p) => ({ x: p.x / m, y: p.y / m }))
}

/** 中心线二次贝塞尔，两侧按半宽外扩；thick ≥ w/2 时退化为椭圆。 */
export function sampleFeature(p: FeatureParams, out: Float32Array): Float32Array {
	const L = Math.max(1e-3, Math.hypot(p.w, 2.2 * p.bend))
	const c = Math.min(0.5, Math.max(1e-3, p.thick) / L)
	const cr = Math.cos(p.rot)
	const sr = Math.sin(p.rot)
	for (let i = 0; i < FN; i++) {
		const s = (1 - Math.cos((Math.PI * i) / (FN - 1))) / 2
		const cx = (s - 0.5) * p.w
		const cy = 4 * p.bend * s * (1 - s)
		let tx = p.w
		let ty = 4 * p.bend * (1 - 2 * s)
		const tl = Math.hypot(tx, ty) || 1
		tx /= tl
		ty /= tl
		const u = (s - Math.min(Math.max(s, c), 1 - c)) / c
		const env = Math.sqrt(Math.max(0, 1 - u * u))
		const b = p.bulge * Math.sin(Math.PI * s)
		const up = (p.thick + (b * (1 + p.lift)) / 2) * env
		const dn = (p.thick + (b * (1 - p.lift)) / 2) * env
		const ax = cx - ty * up
		const ay = cy + tx * up
		const bx = cx + ty * dn
		const by = cy - tx * dn
		out[i * 4] = ax * cr - ay * sr + p.x
		out[i * 4 + 1] = ax * sr + ay * cr + p.y
		out[i * 4 + 2] = bx * cr - by * sr + p.x
		out[i * 4 + 3] = bx * sr + by * cr + p.y
	}
	return out
}

export function growFeature(p: FeatureParams, g: number): FeatureParams {
	for (const key of GROW_KEYS) p[key] *= g
	return p
}

export function lerpFeature(cur: FeatureParams, target: FeatureParams, k: number): void {
	for (const key of FEATURE_KEYS) cur[key] += (target[key] - cur[key]) * k
}

export const shadeHex = (hex: string, k: number): string =>
	'#' +
	[1, 3, 5]
		.map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0'))
		.join('')

export const ringPath = (pts: Point[], dx = 0, dy = 0): string =>
	'M' + pts.map((p) => `${(p.x + dx).toFixed(4)} ${(p.y + dy).toFixed(4)}`).join('L') + 'Z'

export function featurePath(s: Float32Array): string {
	let d = `M${s[0]!.toFixed(4)} ${s[1]!.toFixed(4)}`
	for (let j = 1; j < FN; j++) d += `L${s[j * 4]!.toFixed(4)} ${s[j * 4 + 1]!.toFixed(4)}`
	for (let j = FN - 1; j >= 0; j--) d += `L${s[j * 4 + 2]!.toFixed(4)} ${s[j * 4 + 3]!.toFixed(4)}`
	return d + 'Z'
}
