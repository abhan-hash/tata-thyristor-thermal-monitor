import { act, render, screen } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { HEAT_BREAKPOINTS_C, heatStopIndex } from '../../src/domain/heatScale'
import { CONTOUR_TEXTURE_URL, ContourBackground } from '../../src/visuals/heat/ContourBackground'
import { blobPath, discModel } from '../../src/visuals/heat/discGeometry'
import { discLabel, discStatus, HeatDisc } from '../../src/visuals/heat/HeatDisc'
import { heatDefIds } from '../../src/visuals/heat/HeatDefs'
import { clampHeatPosition, heatMix, heatPosition } from '../../src/visuals/heat/heatRamp'
import {
  estimateTitleWidth,
  FALLBACK_ADVANCE_EM,
  HeatSmearTitle,
  smearCopy,
} from '../../src/visuals/heat/HeatSmearTitle'

describe('heatRamp', () => {
  it('agrees with the stepped heat scale and stays in [0, 8]', () => {
    const temps = [-Infinity, -20, 0, 35, 44.9, ...HEAT_BREAKPOINTS_C, 121.5, 160, Infinity]
    for (const t of temps) {
      const p = heatPosition(t)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(8)
      expect(Math.floor(p)).toBe(heatStopIndex(t))
    }
    expect(heatPosition(Number.NaN)).toBe(0)
  })

  it('is non-decreasing across the range', () => {
    let prev = -1
    for (let t = 20; t <= 140; t += 0.25) {
      const p = heatPosition(t)
      expect(p).toBeGreaterThanOrEqual(prev)
      prev = p
    }
  })

  it('mixes neighbouring heat tokens and never emits a literal colour', () => {
    expect(heatMix(3)).toBe('var(--heat-3)')
    expect(heatMix(3.25)).toBe('color-mix(in srgb, var(--heat-3) 75%, var(--heat-4))')
    expect(heatMix(99)).toBe('var(--heat-8)')
    expect(heatMix(Number.NaN)).toBe('var(--heat-0)')
    expect(clampHeatPosition(-4)).toBe(0)
  })
})

describe('discGeometry', () => {
  it('blobPath is deterministic per seed and differs across seeds', () => {
    expect(blobPath(7, 0.3)).toBe(blobPath(7, 0.3))
    expect(blobPath(7, 0.3)).not.toBe(blobPath(8, 0.3))
    expect(blobPath(7, 0.3)).toMatch(/^M.*Z$/)
  })

  it('keeps rings ordered and grows them with heat', () => {
    for (let p = 0; p <= 8; p += 0.5) {
      const m = discModel(p)
      const radii = [1, ...m.bands.map((b) => b.radius), m.coreRadius]
      for (let i = 1; i < radii.length; i++) {
        expect(radii[i]).toBeLessThan(radii[i - 1] as number)
      }
    }
    expect(discModel(8).bands[0].radius).toBeGreaterThan(discModel(0).bands[0].radius)
    expect(discModel(8).bands[2].color).toBe('var(--heat-8)')
  })
})

describe('HeatDefs ids', () => {
  it('strips useId punctuation so url(#id) references resolve', () => {
    const ids = heatDefIds('«r1»')
    expect(ids.linear).toBe('heat-r1-linear')
    expect(Object.values(ids).every((id) => /^[A-Za-z0-9_-]+$/.test(id))).toBe(true)
  })
})

describe('HeatDisc', () => {
  it.each([
    [90, 'normal', 'ring'],
    [115, 'warning', 'warning'],
    [130, 'critical', 'critical'],
    [Number.NaN, 'fault', 'fault'],
  ] as const)('at %s °C shows %s with a shape marker and a text name', (tj, status, marker) => {
    const { container } = render(<HeatDisc tj={tj} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('data-status', status)
    expect(container.querySelector(`[data-marker="${marker}"]`)).not.toBeNull()
    expect(svg.getAttribute('aria-label')).toBe(discLabel('Junction temperature', tj, status))
  })

  it('renders rim, three bands, a seeded core and crop brackets', () => {
    const { container } = render(<HeatDisc tj={100} seed={4} />)
    expect(container.querySelectorAll('[data-part="band"]')).toHaveLength(3)
    expect(container.querySelector('[data-part="rim"]')).not.toBeNull()
    expect(container.querySelector('[data-part="brackets"]')).not.toBeNull()
    expect(container.querySelector('[data-part="core"] path')).toHaveAttribute('d', blobPath(4, 0.3, 9))
  })

  it('swaps the heat rings for the fault hatch on a non-finite reading', () => {
    const { container } = render(<HeatDisc tj={Number.POSITIVE_INFINITY} />)
    expect(container.querySelectorAll('[data-part="band"]')).toHaveLength(0)
    const face = container.querySelector<SVGElement>('[data-part="face"]')
    expect(face?.style.fill).toMatch(/fault-hatch/)
  })

  it('gives each instance its own gradient and filter ids', () => {
    const { container } = render(
      <>
        <HeatDisc tj={80} />
        <HeatDisc tj={80} />
      </>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('follows a MotionValue without remounting', () => {
    const tj = motionValue(90)
    render(<HeatDisc tj={tj} />)
    const svg = screen.getByRole('img')
    act(() => {
      tj.set(130)
    })
    expect(svg).toHaveAttribute('data-status', 'critical')
    expect(svg.getAttribute('aria-label')).toMatch(/CRITICAL$/)
    act(() => {
      tj.set(Number.NaN)
    })
    expect(screen.getByRole('img')).toBe(svg)
    expect(svg).toHaveAttribute('data-status', 'fault')
  })

  it('discStatus uses the Tj band and treats ±∞ as fault', () => {
    expect(discStatus(109.9)).toBe('normal')
    expect(discStatus(110)).toBe('warning')
    expect(discStatus(125)).toBe('critical')
    expect(discStatus(Number.NEGATIVE_INFINITY)).toBe('fault')
  })
})

describe('HeatSmearTitle', () => {
  it('renders the title plus three blurred trailing copies', () => {
    const { container } = render(<HeatSmearTitle text="STAND-04" intensity={1} />)
    expect(screen.getByRole('img', { name: 'STAND-04' })).toBeInTheDocument()
    const copies = container.querySelectorAll('[data-part="smear"]')
    expect(copies).toHaveLength(3)
    for (const c of copies) {
      expect(c.getAttribute('filter')).toMatch(/^url\(#heat-.*-blur-x\)$/)
      expect(c).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('offsets copies leftward in proportion to clamped intensity', () => {
    expect(smearCopy(1, 0, 64)).toEqual({ dx: -0, opacity: 0 })
    expect(smearCopy(3, 1, 100).dx).toBeCloseTo(-36)
    expect(smearCopy(2, 5, 100)).toEqual(smearCopy(2, 1, 100))
    expect(smearCopy(1, Number.NaN, 64).opacity).toBe(0)
    expect(smearCopy(2, 0.5, 64).dx).toBeLessThan(0)
  })

  it('falls back to a wide-face advance when text cannot be measured', () => {
    // jsdom has no SVG text layout, so the unmeasured estimate is used.
    const { container } = render(<HeatSmearTitle text="STAND-04" fontSize={72} />)
    const svg = container.querySelector('svg')
    const width = Number(svg?.getAttribute('width'))
    // "STAND-04" at 72 px measures ~472 px in Archivo 800 / 125 %; the old 0.68 em estimate gave 392.
    expect(FALLBACK_ADVANCE_EM).toBeGreaterThanOrEqual(0.8)
    expect(width).toBe(estimateTitleWidth('STAND-04', 72))
    expect(width).toBeGreaterThanOrEqual(472)
    expect(svg).toHaveAttribute('viewBox', `0 0 ${String(width)} ${String(Math.ceil(72 * 1.2))}`)
  })

  it('sizes the viewBox to the measured text length', () => {
    const proto = SVGElement.prototype as unknown as { getComputedTextLength?: () => number }
    const original = proto.getComputedTextLength
    proto.getComputedTextLength = function (this: SVGElement) {
      return (this.textContent ?? '').length * 59
    }
    try {
      const { container, rerender } = render(<HeatSmearTitle text="STAND-04" fontSize={72} />)
      const svg = container.querySelector('svg')
      // 8 glyphs × 59 = 472, plus 0.04 em of slack for the final glyph's overhang.
      expect(svg).toHaveAttribute('width', String(Math.ceil(472 + 72 * 0.04)))
      rerender(<HeatSmearTitle text="MILL" fontSize={72} />)
      expect(svg).toHaveAttribute('width', String(Math.ceil(4 * 59 + 72 * 0.04)))
    } finally {
      if (original) proto.getComputedTextLength = original
      else delete proto.getComputedTextLength
    }
  })
})

describe('ContourBackground', () => {
  it('is a non-interactive, hidden texture layer at the contour opacity', () => {
    const { container } = render(<ContourBackground />)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el.style.pointerEvents).toBe('none')
    expect(el.style.opacity).toBe('var(--line-contour-opacity)')
    expect(CONTOUR_TEXTURE_URL).toMatch(/textures\/contours\.svg$/)
  })
})
