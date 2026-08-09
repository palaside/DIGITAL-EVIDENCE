import { describe, it, expect } from 'vitest'
import { computeScaleAndOffsets } from './scale'

describe('computeScaleAndOffsets', () => {
  it('returns scale 1 and zero offsets when image equals canvas', () => {
    const res = computeScaleAndOffsets(645, 890)
    expect(res.scale).toBeCloseTo(1)
    expect(res.Wnew).toBe(645)
    expect(res.Hnew).toBe(890)
    expect(res.x_start).toBeCloseTo(0)
    expect(res.y_start).toBeCloseTo(0)
  })

  it('scales down proportionally when larger than canvas', () => {
    const res = computeScaleAndOffsets(1290, 1780) // exactly 2x
    expect(res.scale).toBeCloseTo(0.5)
    expect(res.Wnew).toBe(645)
    expect(res.Hnew).toBe(890)
    expect(res.x_start).toBeCloseTo(0)
    expect(res.y_start).toBeCloseTo(0)
  })

  it('handles wide images by fitting width and centering vertically', () => {
    const res = computeScaleAndOffsets(1000, 500)
    // scale = min(645/1000, 890/500) = 0.645
    expect(res.scale).toBeCloseTo(645 / 1000)
    expect(res.Wnew).toBe(645)
    expect(res.Hnew).toBe(Math.round(500 * (645 / 1000)))
    expect(res.x_start).toBeCloseTo(0)
    const expectedY = (890 - Math.round(500 * (645 / 1000))) / 2
    expect(res.y_start).toBeCloseTo(expectedY)
  })

  it('throws on invalid inputs', () => {
    expect(() => computeScaleAndOffsets(0, 100)).toThrow()
    expect(() => computeScaleAndOffsets(-10, 100)).toThrow()
    expect(() => computeScaleAndOffsets(NaN, 100)).toThrow()
  })
})
