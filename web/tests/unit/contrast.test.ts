// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * WCAG AA contrast for semantic and component token pairs (Requirement 39.2):
 * ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI component boundaries.
 * Token values are read from the CSS files, so a remapped token is checked as shipped.
 */
const STYLES = resolve(import.meta.dirname, '../../src/styles')
const FILES = ['tokens.primitive.css', 'tokens.semantic.css', 'tokens.component.css']

function parseTokens(): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const file of FILES) {
    const css = readFileSync(resolve(STYLES, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(m[1] as string, (m[2] as string).replace(/\s+/g, ' ').trim())
    }
  }
  return tokens
}

type Rgb = readonly [number, number, number]

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Unsupported colour ${hex}`)
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb
}

/** Resolves a token to an opaque sRGB colour (hex, var() chains and `color-mix(in srgb, …)`). */
function resolveColour(value: string, tokens: Map<string, string>, depth = 0): Rgb {
  if (depth > 20) throw new Error(`Token cycle at ${value}`)
  const v = value.trim()
  const ref = /^var\((--[\w-]+)\)$/.exec(v)
  if (ref) {
    const next = tokens.get(ref[1] as string)
    if (next === undefined) throw new Error(`Unknown token ${ref[1] as string}`)
    return resolveColour(next, tokens, depth + 1)
  }
  const mix = /^color-mix\(in srgb, (.+?) (\d+(?:\.\d+)?)%, (.+)\)$/.exec(v)
  if (mix) {
    const p = Number(mix[2]) / 100
    const a = resolveColour(mix[1] as string, tokens, depth + 1)
    const b = resolveColour(mix[3] as string, tokens, depth + 1)
    return a.map((c, i) => c * p + (b[i] as number) * (1 - p)) as unknown as Rgb
  }
  return hexToRgb(v)
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const tokens = parseTokens()
const ratio = (fg: string, bg: string) =>
  contrastRatio(resolveColour(`var(${fg})`, tokens), resolveColour(`var(${bg})`, tokens))

const TEXT_SURFACES = ['--surface-page', '--surface-panel', '--surface-raised', '--surface-sunken']

/** Body-size text pairs: ≥ 4.5:1. */
const BODY_PAIRS: readonly (readonly [string, string])[] = [
  ...['--text-primary', '--text-secondary', '--text-muted'].flatMap((fg) =>
    TEXT_SURFACES.map((bg) => [fg, bg] as const),
  ),
  ...['--surface-page', '--surface-panel', '--surface-raised'].map((bg) => ['--status-critical-text', bg] as const),
  ['--status-warning', '--surface-panel'],
  ['--status-normal', '--surface-panel'],
  ['--accent', '--surface-page'],
  ['--accent', '--surface-panel'],
  ['--on-accent', '--accent'],
  ['--field-suffix-color', '--field-bg'],
  ['--field-hint-color', '--surface-panel'],
]

/** Large text and UI component boundaries: ≥ 3:1. */
const UI_PAIRS: readonly (readonly [string, string])[] = [
  ['--focus-ring-color', '--focus-ring-offset-color'],
  ['--focus-ring-color', '--surface-panel'],
  ['--focus-ring-color', '--surface-raised'],
  ['--source-btn-border', '--surface-page'],
  ['--source-btn-border', '--surface-panel'],
  ['--field-border', '--field-bg'],
  ['--field-border', '--surface-panel'],
  ['--filter-chip-border', '--surface-panel'],
  ['--status-critical', '--surface-panel'],
  ['--status-critical', '--surface-raised'],
]

describe('token contrast (WCAG AA)', () => {
  it('computes the WCAG ratio for known colours', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio(hexToRgb('#777777'), hexToRgb('#ffffff'))).toBeCloseTo(4.48, 2)
  })

  it.each(BODY_PAIRS)('%s on %s ≥ 4.5:1', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('%s against %s ≥ 3:1', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3)
  })
})
