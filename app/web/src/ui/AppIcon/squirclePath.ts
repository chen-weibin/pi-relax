// Uniform-corner path generator ported from figma-squircle (MIT).
// https://github.com/phamfoo/figma-squircle
// Mirrors `getSvgPath` for the case where all four corners share one radius.

type PathParams = {
	a: number
	b: number
	c: number
	d: number
	p: number
	arcSectionLength: number
	cornerRadius: number
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const f = (value: number) => value.toFixed(4)

function getPathParamsForCorner(cornerRadius: number, cornerSmoothing: number, budget: number): PathParams {
	let p = (1 + cornerSmoothing) * cornerRadius
	const maxCornerSmoothing = budget / cornerRadius - 1
	const smoothing = Math.min(cornerSmoothing, maxCornerSmoothing)
	p = Math.min(p, budget)

	const arcMeasure = 90 * (1 - smoothing)
	const arcSectionLength = Math.sin(toRadians(arcMeasure / 2)) * cornerRadius * Math.SQRT2
	const angleAlpha = (90 - arcMeasure) / 2
	const p3ToP4Distance = cornerRadius * Math.tan(toRadians(angleAlpha / 2))
	const angleBeta = 45 * smoothing
	const c = p3ToP4Distance * Math.cos(toRadians(angleBeta))
	const d = c * Math.tan(toRadians(angleBeta))
	const b = (p - arcSectionLength - c - d) / 3

	return { a: 2 * b, b, c, d, p, arcSectionLength, cornerRadius }
}

function drawTopRight({ a, b, c, d, arcSectionLength, cornerRadius }: PathParams) {
	if (!cornerRadius) return `l ${f(0)} 0`
	return (
		`c ${f(a)} 0 ${f(a + b)} 0 ${f(a + b + c)} ${f(d)} ` +
		`a ${f(cornerRadius)} ${f(cornerRadius)} 0 0 1 ${f(arcSectionLength)} ${f(arcSectionLength)} ` +
		`c ${f(d)} ${f(c)} ${f(d)} ${f(b + c)} ${f(d)} ${f(a + b + c)}`
	)
}

function drawBottomRight({ a, b, c, d, arcSectionLength, cornerRadius }: PathParams) {
	if (!cornerRadius) return `l 0 ${f(0)}`
	return (
		`c 0 ${f(a)} 0 ${f(a + b)} ${f(-d)} ${f(a + b + c)} ` +
		`a ${f(cornerRadius)} ${f(cornerRadius)} 0 0 1 ${f(-arcSectionLength)} ${f(arcSectionLength)} ` +
		`c ${f(-c)} ${f(d)} ${f(-(b + c))} ${f(d)} ${f(-(a + b + c))} ${f(d)}`
	)
}

function drawBottomLeft({ a, b, c, d, arcSectionLength, cornerRadius }: PathParams) {
	if (!cornerRadius) return `l ${f(0)} 0`
	return (
		`c ${f(-a)} 0 ${f(-(a + b))} 0 ${f(-(a + b + c))} ${f(-d)} ` +
		`a ${f(cornerRadius)} ${f(cornerRadius)} 0 0 1 ${f(-arcSectionLength)} ${f(-arcSectionLength)} ` +
		`c ${f(-d)} ${f(-c)} ${f(-d)} ${f(-(b + c))} ${f(-d)} ${f(-(a + b + c))}`
	)
}

function drawTopLeft({ a, b, c, d, arcSectionLength, cornerRadius }: PathParams) {
	if (!cornerRadius) return `l 0 ${f(0)}`
	return (
		`c 0 ${f(-a)} 0 ${f(-(a + b))} ${f(d)} ${f(-(a + b + c))} ` +
		`a ${f(cornerRadius)} ${f(cornerRadius)} 0 0 1 ${f(arcSectionLength)} ${f(-arcSectionLength)} ` +
		`c ${f(c)} ${f(-d)} ${f(b + c)} ${f(-d)} ${f(a + b + c)} ${f(-d)}`
	)
}

export function getSquirclePath(width: number, height: number, cornerRadius: number, cornerSmoothing: number): string {
	const budget = Math.min(width, height) / 2
	const params = getPathParamsForCorner(Math.min(cornerRadius, budget), cornerSmoothing, budget)
	return [
		`M ${f(width - params.p)} 0`,
		drawTopRight(params),
		`L ${f(width)} ${f(height - params.p)}`,
		drawBottomRight(params),
		`L ${f(params.p)} ${f(height)}`,
		drawBottomLeft(params),
		`L 0 ${f(params.p)}`,
		drawTopLeft(params),
		'Z',
	].join(' ')
}
