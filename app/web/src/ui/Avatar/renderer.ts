import {
	ANIMATIONS,
	BODY_POSE,
	DEFAULT_CONFIG,
	EXPRESSIONS,
	mergeConfig,
	SHAPES,
	type AvatarConfig,
	type AvatarConfigPatch,
	type AvatarExpression,
	type AvatarShape,
	type BodyPose,
	type FaceAnchor,
	type PoseState,
} from './config.ts'
import {
	FEATURE_DEFAULT,
	featurePath,
	FN,
	growFeature,
	lerpFeature,
	ringPath,
	sampleFeature,
	shadeHex,
	type FeatureParams,
	type Point,
} from './geometry.ts'

// ponytail: 伪 3D 视差，视角固定正面；要交互倾斜请用 playground avatar-demo4
const FRONT_DEPTH = 0.42
const SHADE = 0.86
const LIGHT = { x: -0.075, y: 0.075 }
const DEG = 180 / Math.PI

let uid = 0

type RendererOptions = {
	onChange?: (config: AvatarConfig) => void
	/** When true, skip loop animations and paint a static frame. */
	reducedMotion?: boolean
}

export class AvatarRenderer {
	svg: SVGSVGElement
	onChange?: (config: AvatarConfig) => void
	reducedMotion: boolean
	config: AvatarConfig

	private $view!: SVGGElement
	private $root!: SVGGElement
	private $outline!: SVGPathElement
	private $body!: SVGPathElement
	private $shade!: SVGPathElement
	private $clip!: SVGPathElement
	private $face!: SVGGElement
	private $features!: Element[]
	private sample = new Float32Array(FN * 4)

	private clock = 0
	private popT = 10
	private weights: Record<string, number>
	private pose: PoseState = {
		f: [{ ...FEATURE_DEFAULT }, { ...FEATURE_DEFAULT }, { ...FEATURE_DEFAULT }],
		body: { ...BODY_POSE, sx: 1, sy: 1 },
	}
	private view = { yaw: 0, pitch: 0, zoom: 1 }

	private target!: FeatureParams[]
	private targetBody!: BodyPose
	private cur!: FeatureParams[]
	private curBody!: BodyPose
	private faceTarget!: FaceAnchor & { grow: number }
	private faceCur!: FaceAnchor & { grow: number }

	private _pts: Point[] = []
	private _shape?: AvatarShape
	private _expression?: AvatarExpression
	private _shadeKey: string | null = null
	private _ready = false
	private _disposed = false
	private _raf = 0
	private _last?: number
	private _onVisibility: () => void

	constructor(svg: SVGSVGElement, config: AvatarConfigPatch = {}, options: RendererOptions = {}) {
		this.svg = svg
		this.onChange = options.onChange
		this.reducedMotion = options.reducedMotion ?? false
		this.config = structuredClone(DEFAULT_CONFIG)
		this.weights = Object.fromEntries(Object.keys(ANIMATIONS).map((k) => [k, 0]))

		const clipId = `avatar-clip-${++uid}`
		svg.innerHTML = `
          <defs><clipPath id="${clipId}"><path data-el="clip"/></clipPath></defs>
          <g data-el="view"><g transform="scale(1 -1)"><g data-el="root">
            <path data-el="outline" fill="none" stroke-linejoin="round"/>
            <path data-el="body"/>
            <path data-el="shade" fill-rule="evenodd" clip-path="url(#${clipId})"/>
            <g data-el="face"><path/><path/><path/></g>
          </g></g></g>`
		const el = <T extends Element>(n: string) => svg.querySelector(`[data-el="${n}"]`) as T
		this.$view = el('view')
		this.$root = el('root')
		this.$outline = el('outline')
		this.$body = el('body')
		this.$shade = el('shade')
		this.$clip = el('clip')
		this.$face = el('face')
		this.$features = [...this.$face.children]

		this._onVisibility = () => (document.hidden ? this._stop() : this._start())
		document.addEventListener('visibilitychange', this._onVisibility)

		this.setConfig(config)
		this.cur = this.target.map((p) => ({ ...p }))
		this.curBody = { ...this.targetBody }
		for (const k of EXPRESSIONS[this.config.expression].loops) this.weights[k] = 1
		this._ready = true
		if (this.reducedMotion) {
			this._paintStatic()
		} else {
			this._start()
		}
	}

	getConfig(): AvatarConfig {
		return structuredClone(this.config)
	}

	setConfig(patch: AvatarConfigPatch = {}): void {
		const next = mergeConfig(this.config, patch)
		this.config = next

		if (next.shape !== this._shape) this._applyShape(next.shape)
		if (next.expression !== this._expression) this._applyExpression(next.expression)
		const ft = SHAPES[next.shape].face[next.faceSize]
		this.faceTarget = { y: ft.y, scale: ft.scale, grow: ft.grow ?? 1 }
		if (!this._ready) this.faceCur = { ...this.faceTarget }

		const c = next.colors
		this.$body.setAttribute('fill', c.body)
		this.$shade.setAttribute('fill', shadeHex(c.body, SHADE))
		this.$face.setAttribute('fill', c.face)
		this.$outline.setAttribute('stroke', c.outline)
		this.$outline.setAttribute('stroke-width', String(next.outline.width * 2))
		this.$outline.style.display = next.outline.enabled ? '' : 'none'
		// colors.background 给外层容器（uidoc 预览底）。写到 svg 上会变成方形底，且 mergeConfig 不收 transparent。

		if (this.reducedMotion && this._ready) {
			this.cur = this.target.map((p) => ({ ...p }))
			this.curBody = { ...this.targetBody }
			this.faceCur = { ...this.faceTarget }
			this._paintStatic()
		}

		this.onChange?.(this.getConfig())
	}

	setReducedMotion(value: boolean): void {
		if (this.reducedMotion === value) return
		this.reducedMotion = value
		if (value) {
			this._stop()
			this._paintStatic()
		} else if (this._ready && !this._disposed) {
			this._start()
		}
	}

	resetAnimation(): void {
		this.clock = 0
	}

	private _applyShape(name: AvatarShape): void {
		this._pts = SHAPES[name].outline()
		const d = ringPath(this._pts)
		for (const p of [this.$body, this.$outline, this.$clip]) p.setAttribute('d', d)
		this._shadeKey = null
		this._shape = name
		if (this._ready) this.popT = 0
	}

	private _applyExpression(name: AvatarExpression): void {
		const e = EXPRESSIONS[name]
		this.target = e.features.map((p) => ({ ...p }))
		this.targetBody = { ...BODY_POSE, ...e.body }
		this._expression = name
		if (this._ready) this.popT = 0
	}

	private _paintStatic(): void {
		const pose = this.pose
		this.cur.forEach((c, i) => Object.assign(pose.f[i]!, c))
		Object.assign(pose.body, this.curBody, { sx: 1, sy: 1 })
		for (const f of pose.f) growFeature(f, this.faceCur.grow)

		const b = pose.body
		this.$view.setAttribute('transform', 'scale(1)')
		this.$root.setAttribute(
			'transform',
			`translate(0 ${b.y.toFixed(4)}) rotate(${(b.rz * DEG).toFixed(3)}) scale(1 1)`,
		)

		const fc = this.faceCur
		this.$face.setAttribute(
			'transform',
			`translate(0 ${fc.y.toFixed(4)}) scale(${fc.scale.toFixed(4)} ${fc.scale.toFixed(4)})`,
		)

		const ox = LIGHT.x
		const oy = LIGHT.y
		this._shadeKey = `${ox.toFixed(4)},${oy.toFixed(4)}`
		this.$shade.setAttribute('d', 'M-3 -3H3V3H-3Z' + ringPath(this._pts, ox, oy))

		const s = this.sample
		this.$features.forEach((path, i) =>
			path.setAttribute('d', featurePath(sampleFeature(pose.f[i]!, s))),
		)
	}

	private _frame = (now: number): void => {
		this._raf = requestAnimationFrame(this._frame)
		const dt = Math.min(0.05, (now - (this._last ?? now)) / 1000)
		this._last = now
		const anim = this.config.animation
		if (!anim.paused) this.clock += dt * anim.speed

		const k = 1 - Math.exp(-dt * 9)
		this.cur.forEach((c, i) => lerpFeature(c, this.target[i]!, k))
		for (const key of Object.keys(BODY_POSE) as (keyof BodyPose)[]) {
			this.curBody[key] += (this.targetBody[key] - this.curBody[key]) * k
		}
		for (const key of ['y', 'scale', 'grow'] as const) {
			this.faceCur[key] += (this.faceTarget[key] - this.faceCur[key]) * k
		}

		const loops = EXPRESSIONS[this._expression!].loops
		const kw = 1 - Math.exp(-dt * 4)
		for (const name in this.weights) {
			const goal = anim.loop && loops.includes(name) ? 1 : 0
			this.weights[name]! += (goal - this.weights[name]!) * kw
		}

		const pose = this.pose
		this.cur.forEach((c, i) => Object.assign(pose.f[i]!, c))
		Object.assign(pose.body, this.curBody, { sx: 1, sy: 1 })
		for (const name in ANIMATIONS) {
			const w = this.weights[name]!
			if (w > 1e-3) ANIMATIONS[name]!.run(this.clock, pose, w)
		}
		for (const f of pose.f) growFeature(f, this.faceCur.grow)

		const b = pose.body
		const yaw = this.view.yaw + b.ry
		const pitch = this.view.pitch + b.rx

		this.popT += dt
		const pop = 0.05 * Math.exp(-this.popT * 6) * Math.sin(this.popT * 20)
		const sx = b.sx * (1 - pop * 0.6) * (1 - 0.06 * yaw * yaw)
		const sy = b.sy * (1 + pop) * (1 - 0.06 * pitch * pitch)
		this.$view.setAttribute('transform', `scale(${this.view.zoom.toFixed(4)})`)
		this.$root.setAttribute(
			'transform',
			`translate(0 ${b.y.toFixed(4)}) rotate(${(b.rz * DEG).toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`,
		)

		const fc = this.faceCur
		const fx = FRONT_DEPTH * Math.sin(yaw)
		const fy = fc.y * Math.cos(pitch) - FRONT_DEPTH * Math.sin(pitch)
		this.$face.setAttribute(
			'transform',
			`translate(${fx.toFixed(4)} ${fy.toFixed(4)}) scale(${(fc.scale * Math.cos(yaw)).toFixed(4)} ${(fc.scale * Math.cos(pitch)).toFixed(4)})`,
		)

		const ox = LIGHT.x + 0.1 * yaw
		const oy = LIGHT.y + 0.1 * pitch
		const shadeKey = `${ox.toFixed(4)},${oy.toFixed(4)}`
		if (shadeKey !== this._shadeKey) {
			this._shadeKey = shadeKey
			this.$shade.setAttribute('d', 'M-3 -3H3V3H-3Z' + ringPath(this._pts, ox, oy))
		}

		const s = this.sample
		this.$features.forEach((path, i) =>
			path.setAttribute('d', featurePath(sampleFeature(pose.f[i]!, s))),
		)
	}

	private _start(): void {
		if (this._raf || document.hidden || this._disposed || this.reducedMotion) return
		this._last = undefined
		this._raf = requestAnimationFrame(this._frame)
	}

	private _stop(): void {
		cancelAnimationFrame(this._raf)
		this._raf = 0
	}

	dispose(): void {
		this._disposed = true
		this._stop()
		document.removeEventListener('visibilitychange', this._onVisibility)
		this.svg.innerHTML = ''
	}
}
