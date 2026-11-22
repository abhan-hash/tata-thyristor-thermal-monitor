import { act, render, screen } from '@testing-library/react'
import { motion, MotionConfig, motionValue } from 'motion/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { formatValue, PLACEHOLDER, TEMP_C_SPEC } from '../../src/domain/format'
import { AnimatedNumber } from '../../src/motion/AnimatedNumber'
import { DURATION_MS, EASE_IN_OUT, EASE_OUT } from '../../src/motion/tokens'
import {
  ENTRANCE_OFFSET_MS,
  ENTRANCE_SLOTS,
  entranceTimeline,
  entranceTotalMs,
  useEntrance,
} from '../../src/motion/useEntrance'
import { resetUiStore, useUiStore } from '../../src/state/uiStore'

/* Motion foundations: tokens, page entrances, live numbers (Requirements 32.1, 32.2, 33.1, 35.1, 35.2). */

function Instant({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="always">{children}</MotionConfig>
}

const wait = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

describe('motion tokens', () => {
  it('match the CSS duration and easing tokens', () => {
    const css = readFileSync(resolve(__dirname, '../../src/styles/tokens.primitive.css'), 'utf8')
    const token = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()
    expect(token('dur-1')).toBe(`${String(DURATION_MS[1])}ms`)
    expect(token('dur-2')).toBe(`${String(DURATION_MS[2])}ms`)
    expect(token('dur-3')).toBe(`${String(DURATION_MS[3])}ms`)
    expect(token('dur-entrance')).toBe(`${String(DURATION_MS.entrance)}ms`)
    expect(token('ease-out')).toBe(`cubic-bezier(${EASE_OUT.join(', ')})`)
    expect(token('ease-in-out')).toBe(`cubic-bezier(${EASE_IN_OUT.join(', ')})`)
  })
})

describe('entrance timeline', () => {
  it('orders hero, visual, secondary with offsets of at most 60 ms and lasts under 700 ms', () => {
    expect(ENTRANCE_SLOTS).toEqual(['hero', 'visual', 'secondary'])
    const timeline = entranceTimeline()
    expect(timeline).toHaveLength(3)
    timeline.forEach((t, i) => {
      if (i === 0) {
        expect(t.delayMs).toBe(0)
        return
      }
      const gap = t.delayMs - (timeline[i - 1]?.delayMs ?? 0)
      expect(gap).toBeGreaterThan(0)
      expect(gap).toBeLessThanOrEqual(ENTRANCE_OFFSET_MS)
    })
    expect(ENTRANCE_OFFSET_MS).toBeLessThanOrEqual(60)
    expect(entranceTotalMs(timeline)).toBeLessThan(700)
  })
})

function Page({ pageKey }: { pageKey: string }) {
  const entrance = useEntrance(pageKey)
  return (
    <div data-testid="page" data-playing={String(entrance.playing)}>
      <motion.div data-testid="hero" {...entrance.slot('hero')}>
        <span data-testid="hero-child">STAND-04</span>
      </motion.div>
      <motion.div data-testid="secondary" {...entrance.slot('secondary')} />
    </div>
  )
}

describe('useEntrance', () => {
  beforeEach(() => {
    resetUiStore()
  })

  it('plays on the first visit of a session, then renders the final state', () => {
    const first = render(<Page pageKey="overview" />)
    expect(screen.getByTestId('page')).toHaveAttribute('data-playing', 'true')
    expect(screen.getByTestId('hero')).toHaveAttribute('data-entrance', 'hero')
    expect(screen.getByTestId('secondary')).toHaveAttribute('data-entrance', 'secondary')
    // The slot starts hidden; its children carry no motion of their own.
    expect(screen.getByTestId('hero').style.opacity).toBe('0')
    expect(screen.getByTestId('hero-child').getAttribute('style')).toBeNull()
    expect(useUiStore.getState().entrancePlayed.overview).toBe(true)
    first.unmount()

    render(<Page pageKey="overview" />)
    expect(screen.getByTestId('page')).toHaveAttribute('data-playing', 'false')
    expect(screen.getByTestId('hero')).not.toHaveAttribute('data-entrance')
    expect(screen.getByTestId('hero').style.opacity).toBe('')
  })

  it('tracks each page separately', () => {
    render(<Page pageKey="alarms" />)
    expect(useUiStore.getState().entrancePlayed).toEqual({ alarms: true })
    expect(useUiStore.getState().entrancePlayed.trends).toBeUndefined()
  })

  it('is skipped under reduced motion', () => {
    render(<Page pageKey="about" />, { wrapper: Instant })
    expect(screen.getByTestId('page')).toHaveAttribute('data-playing', 'false')
    expect(screen.getByTestId('hero')).not.toHaveAttribute('data-entrance')
  })
})

describe('AnimatedNumber', () => {
  const fixed = (v: number) => formatValue(v, TEMP_C_SPEC)

  it('renders tabular figures at a constant text width', async () => {
    const value = motionValue(5)
    render(<AnimatedNumber value={value} format={fixed} data-testid="n" />)
    const node = screen.getByTestId('n')
    expect(node).toHaveClass('num')
    const width = node.textContent.length
    for (const v of [123.4, -12, 0.04, Number.NaN]) {
      act(() => {
        value.set(v)
      })
      await wait(20)
      expect(node.textContent).toHaveLength(width)
    }
  })

  it('tweens toward a new value over about 200 ms', async () => {
    const value = motionValue(100)
    render(<AnimatedNumber value={value} format={fixed} data-testid="n" />)
    act(() => {
      value.set(120)
    })
    expect(screen.getByTestId('n').textContent).not.toBe(fixed(120))
    await wait(400)
    expect(screen.getByTestId('n').textContent).toBe(fixed(120))
  })

  it('sets the value immediately under reduced motion', () => {
    const value = motionValue(100)
    render(<AnimatedNumber value={value} format={fixed} data-testid="n" />, { wrapper: Instant })
    act(() => {
      value.set(118.04)
    })
    expect(screen.getByTestId('n').textContent).toBe(fixed(118.04))
  })

  it('jumps to and from a placeholder instead of tweening', () => {
    const value = motionValue(Number.NaN)
    const format = (v: number) => (Number.isFinite(v) ? fixed(v) : PLACEHOLDER)
    render(<AnimatedNumber value={value} format={format} data-testid="n" />)
    expect(screen.getByTestId('n').textContent).toBe(PLACEHOLDER)
    act(() => {
      value.set(84.2)
    })
    expect(screen.getByTestId('n').textContent).toBe(fixed(84.2))
    act(() => {
      value.set(Number.NaN)
    })
    expect(screen.getByTestId('n').textContent).toBe(PLACEHOLDER)
  })
})
