import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ANIMATIONS, EXPRESSIONS, FACE_SIZES, SHAPES } from './config.ts'
import { FEATURE_KEYS, FN, lerpFeature, sampleFeature } from './geometry.ts'

describe('Avatar config registries', () => {
	it('keeps three numeric features and known loops per expression', () => {
		const buf = new Float32Array(FN * 4)
		for (const [id, expression] of Object.entries(EXPRESSIONS)) {
			assert.equal(expression.features.length, 3, `表情 ${id} 需要 3 个特征`)
			for (const params of expression.features) {
				assert.ok(
					FEATURE_KEYS.every((key) => Number.isFinite(params[key])),
					`表情 ${id} 参数非数值`,
				)
				assert.ok(
					sampleFeature(params, buf).every(Number.isFinite),
					`表情 ${id} 采样出 NaN`,
				)
			}
			for (const loop of expression.loops) {
				assert.ok(ANIMATIONS[loop], `表情 ${id} 引用了不存在的动画 ${loop}`)
			}
		}
	})

	it('keeps valid outlines and face-size anchors per shape', () => {
		for (const [id, shape] of Object.entries(SHAPES)) {
			const pts = shape.outline()
			assert.ok(pts.length >= 16, `形状 ${id} 轮廓点数过少`)
			assert.ok(
				pts.every((p) => Number.isFinite(p.x + p.y)),
				`形状 ${id} 轮廓无效`,
			)
			assert.ok(
				(Object.keys(FACE_SIZES) as (keyof typeof FACE_SIZES)[]).every((key) => shape.face[key]),
				`形状 ${id} 缺少五官尺寸锚点`,
			)
		}
	})

	it('lerps a feature fully onto its target', () => {
		const current = { ...EXPRESSIONS.neutral.features[2]! }
		const target = EXPRESSIONS.excited.features[2]!
		lerpFeature(current, target, 1)
		assert.ok(FEATURE_KEYS.every((key) => Math.abs(current[key] - target[key]) < 1e-9))
	})
})
