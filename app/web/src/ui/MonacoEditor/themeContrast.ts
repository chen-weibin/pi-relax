/** 代码字号抗锯齿之后仍要能分开。低于这个值就往白色抬。 */
export const MIN_TEXT_CONTRAST = 7

type Rgb = { r: number; g: number; b: number; a: number }

function channel(hex: string, index: number): number {
	return Number.parseInt(hex.slice(index, index + 2), 16)
}

function parseColor(input: string): { rgb: Rgb; hash: boolean } | null {
	const raw = input.trim()
	const hash = raw.startsWith('#')
	let hex = (hash ? raw.slice(1) : raw).toLowerCase()
	if (!/^[0-9a-f]+$/.test(hex)) return null
	if (hex.length === 3 || hex.length === 4) {
		hex = hex
			.split('')
			.map((c) => c + c)
			.join('')
	}
	if (hex.length !== 6 && hex.length !== 8) return null
	return {
		hash,
		rgb: {
			r: channel(hex, 0),
			g: channel(hex, 2),
			b: channel(hex, 4),
			a: hex.length === 8 ? channel(hex, 6) / 255 : 1,
		},
	}
}

function composite(fg: Rgb, bg: Rgb): Rgb {
	const a = fg.a
	return {
		r: fg.r * a + bg.r * (1 - a),
		g: fg.g * a + bg.g * (1 - a),
		b: fg.b * a + bg.b * (1 - a),
		a: 1,
	}
}

function linear(value: number) {
	const s = value / 255
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(color: Rgb) {
	return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b)
}

function contrast(fg: Rgb, bg: Rgb) {
	const a = luminance(fg)
	const b = luminance(bg)
	const lighter = Math.max(a, b)
	const darker = Math.min(a, b)
	return (lighter + 0.05) / (darker + 0.05)
}

function toHex(color: Rgb) {
	const byte = (value: number) => Math.round(value).toString(16).padStart(2, '0')
	return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}`
}

/** 前景和编辑器背景糊在一起时，混入白色直到达到下限。背景色、已经够亮的颜色不动。 */
export function readableForeground(color: string, background: string): string {
	const fg = parseColor(color)
	const bg = parseColor(background)
	if (!fg || !bg || bg.rgb.a !== 1) return color
	const solid = composite(fg.rgb, bg.rgb)
	if (contrast(solid, bg.rgb) >= MIN_TEXT_CONTRAST) return color
	let low = 0
	let high = 1
	let best = { r: 255, g: 255, b: 255, a: 1 }
	for (let i = 0; i < 12; i++) {
		const t = (low + high) / 2
		const mixed = {
			r: solid.r + (255 - solid.r) * t,
			g: solid.g + (255 - solid.g) * t,
			b: solid.b + (255 - solid.b) * t,
			a: 1,
		}
		if (contrast(mixed, bg.rgb) >= MIN_TEXT_CONTRAST) {
			best = mixed
			high = t
		} else low = t
	}
	let hex = toHex(best)
	let parsed = parseColor(hex)
	while (
		parsed &&
		contrast(parsed.rgb, bg.rgb) < MIN_TEXT_CONTRAST &&
		(parsed.rgb.r < 255 || parsed.rgb.g < 255 || parsed.rgb.b < 255)
	) {
		parsed = {
			hash: true,
			rgb: {
				r: Math.min(255, parsed.rgb.r + 1),
				g: Math.min(255, parsed.rgb.g + 1),
				b: Math.min(255, parsed.rgb.b + 1),
				a: 1,
			},
		}
		hex = toHex(parsed.rgb)
	}
	return fg.hash ? hex : hex.slice(1)
}

/** 前景相对不透明背景的对比度。颜色解析不了时返回 0。 */
export function foregroundContrast(color: string, background: string): number {
	const fg = parseColor(color)
	const bg = parseColor(background)
	if (!fg || !bg || bg.rgb.a !== 1) return 0
	return contrast(composite(fg.rgb, bg.rgb), bg.rgb)
}
