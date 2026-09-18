import { describe, expect, it } from 'vitest'
import { optimizeToTargetBytes } from '../../js/target-compressor-engine.js'

describe('optimizeToTargetBytes', () => {
  it('returns high quality if original is already within budget', async () => {
    // Simulated measurement function where size is proportional to (width * height * quality * 0.2)
    const measureFn = async (w, h, q) => Math.round(w * h * q * 0.1)

    const result = await optimizeToTargetBytes({
      originalWidth: 800,
      originalHeight: 600,
      originalBytes: 40 * 1024,
      targetBytes: 100 * 1024,
      measureFn
    })

    expect(result.finalSize).toBeLessThanOrEqual(100 * 1024)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(result.quality).toBe(0.9)
  })

  it('optimizes large image to stay strictly within target budget (e.g. 100KB and 200KB)', async () => {
    // Model realistic photo size: 4000x3000 photo, ~3MB initially
    const measureFn = async (w, h, q) => {
      return Math.round((w * h * 0.25) * q)
    }

    const target100KB = 100 * 1024
    const result100 = await optimizeToTargetBytes({
      originalWidth: 4000,
      originalHeight: 3000,
      originalBytes: 4 * 1024 * 1024,
      targetBytes: target100KB,
      measureFn
    })

    expect(result100.finalSize).toBeLessThanOrEqual(target100KB)
    expect(result100.quality).toBeGreaterThan(0)
    expect(result100.width).toBeGreaterThan(0)

    const target200KB = 200 * 1024
    const result200 = await optimizeToTargetBytes({
      originalWidth: 4000,
      originalHeight: 3000,
      originalBytes: 4 * 1024 * 1024,
      targetBytes: target200KB,
      measureFn
    })

    expect(result200.finalSize).toBeLessThanOrEqual(target200KB)
    expect(result200.finalSize).toBeGreaterThanOrEqual(result100.finalSize)
  })

  it('throws an error if target size is 0 or negative', async () => {
    await expect(optimizeToTargetBytes({
      originalWidth: 800,
      originalHeight: 600,
      originalBytes: 1000,
      targetBytes: 0,
      measureFn: async () => 100
    })).rejects.toThrow('Target size must be greater than 0 bytes.')
  })
})
