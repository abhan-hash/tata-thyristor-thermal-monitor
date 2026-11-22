import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FieldChannel } from '../../src/domain/heatField'
import type { ChannelId } from '../../src/domain/types'
import { blobBands, warpPoint } from '../../src/visuals/heat/blobGeometry'
import { HeatBlobs } from '../../src/visuals/heat/HeatBlobs'

const IDS: ChannelId[] = [1, 2, 3, 4, 5, 6]
const channelsAt = (tjs: number[]): FieldChannel[] =>
  IDS.map((id, i) => ({ id, tj_estimated: tjs[i] as number, sensor_healthy: true }))

describe('blobBands', () => {
  it('returns six bands, outermost first, with non-decreasing heat toward the core', () => {
    const bands = blobBands(channelsAt([80, 95, 118, 102, 90, 85]), 35)
    expect(bands).toHaveLength(6)
    expect(bands.map((b) => b.index)).toEqual([0, 1, 2, 3, 4, 5])
    bands.slice(1).forEach((band, i) => {
      const prev = bands[i] as (typeof bands)[number]
      expect(band.threshold).toBeGreaterThan(prev.threshold)
      expect(band.heat).toBeGreaterThanOrEqual(prev.heat)
    })
    for (const b of bands) expect(b.d).toMatch(/^M[\d.\-,eCLZ\s]+$/)
  })

  it('draws smooth curves (cubic segments) for a hot field', () => {
    const [outer] = blobBands(channelsAt([100, 100, 100, 100, 100, 100]), 35)
    expect(outer?.d).toContain('C')
  })

  it('keeps empty paths for a flat ambient field', () => {
    const bands = blobBands(channelsAt([35, 35, 35, 35, 35, 35]), 35)
    expect(bands).toHaveLength(6)
    for (const b of bands) expect(b.d).toBe('')
  })

  it('warp is deterministic per seed', () => {
    expect(warpPoint(10, 5, 3)).toEqual(warpPoint(10, 5, 3))
    expect(warpPoint(10, 5, 3)).not.toEqual(warpPoint(10, 5, 4))
  })
})

describe('HeatBlobs', () => {
  it('renders exactly six band paths with heat-token fills, hottest last', () => {
    const { container } = render(<HeatBlobs channels={channelsAt([130, 128, 140, 126, 135, 125])} ambient={40} />)
    const paths = container.querySelectorAll('path[data-band]')
    expect(paths).toHaveLength(6)
    paths.forEach((p) => expect((p as SVGPathElement).style.fill).toMatch(/^var\(--heat-\d\)$/))
    expect((paths[5] as SVGPathElement).style.fill).toBe('var(--heat-8)')
    // Maroon core gets the shared --heat-5 halo beneath it.
    expect(container.querySelector('[data-part="heat-blob-halo"]')).not.toBeNull()
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('still renders six paths at ambient', () => {
    const { container } = render(<HeatBlobs channels={channelsAt([35, 35, 35, 35, 35, 35])} ambient={35} />)
    expect(container.querySelectorAll('path[data-band]')).toHaveLength(6)
    expect(container.querySelector('[data-part="heat-blob-halo"]')).toBeNull()
  })
})
