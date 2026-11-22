// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

const WEB = resolve(import.meta.dirname, '../..')
const STYLES = resolve(WEB, 'src/styles')

/** Parse `--name: value;` declarations from a CSS file (comments stripped). */
function parseTokens(file: string): Map<string, string> {
  const css = readFileSync(resolve(STYLES, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = new Map<string, string>()
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(m[1] as string, (m[2] as string).replace(/\s+/g, ' ').trim())
  }
  return tokens
}

// Sampled values from the design's primitive table (Requirement 2.2).
const PRIMITIVES: Record<string, string> = {
  '--ink-950': '#0E0D0C',
  '--ink-900': '#141312',
  '--ink-850': '#1A1918',
  '--ink-800': '#211F1D',
  '--ink-700': '#2C2A27',
  '--ink-600': '#3A3733',
  '--ink-400': '#6E6A63',
  '--ink-350': '#8E8981',
  '--ink-300': '#9A958C',
  '--ink-100': '#E9E5DD',
  '--gold-300': '#F7CD6A',
  '--gold-500': '#F2B533',
  '--gold-700': '#B9821A',
  '--heat-0': '#3A2A1E',
  '--heat-1': '#FFD9A0',
  '--heat-2': '#FFB766',
  '--heat-3': '#FF9233',
  '--heat-4': '#FF6A1A',
  '--heat-5': '#F2421A',
  '--heat-6': '#D9231A',
  '--heat-7': '#A8141C',
  '--heat-8': '#6E0B16',
  '--signal-ok': '#7FB77E',
  '--signal-info': '#8FB3D9',
  '--text-11': '11px',
  '--text-12': '12px',
  '--text-14': '14px',
  '--text-16': '16px',
  '--text-20': '20px',
  '--text-28': '28px',
  '--text-40': '40px',
  '--text-64': '64px',
  '--text-96': '96px',
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-6': '24px',
  '--space-8': '32px',
  '--space-12': '48px',
  '--space-16': '64px',
  '--space-24': '96px',
  '--space-32': '128px',
  '--r-0': '0',
  '--r-1': '2px',
  '--r-2': '6px',
  '--r-3': '12px',
  '--r-pill': '999px',
  '--elev-2': 'inset 0 1px 0 #ffffff0d, 0 18px 40px -12px #000000cc',
  '--ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
  '--ease-in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
  '--dur-1': '120ms',
  '--dur-2': '200ms',
  '--dur-3': '320ms',
  '--dur-entrance': '640ms',
  // Type roles
  '--font-display-weight': '800',
  '--font-display-width': '112%',
  '--font-label-weight': '600',
  '--font-label-width': '125%',
  '--font-label-tracking': '0.32em',
  '--font-label-transform': 'uppercase',
  '--font-body-weight': '400',
  '--font-body-width': '100%',
}

describe('primitive tokens', () => {
  const primitive = parseTokens('tokens.primitive.css')

  it.each(Object.entries(PRIMITIVES))('%s = %s', (name, value) => {
    expect(primitive.get(name)?.toLowerCase()).toBe(value.toLowerCase())
  })

  it('uses Archivo Variable as the base family', () => {
    expect(primitive.get('--font-family-base')).toMatch(/^'Archivo Variable'/)
  })
})

describe('semantic tokens', () => {
  const semantic = parseTokens('tokens.semantic.css')

  it.each([
    ['--surface-page', 'var(--ink-950)'],
    ['--surface-panel', 'var(--ink-900)'],
    ['--surface-raised', 'var(--ink-850)'],
    ['--surface-sunken', '#0B0A09'],
    ['--line-subtle', 'var(--ink-700)'],
    ['--line-strong', 'var(--ink-600)'],
    ['--line-control', 'var(--ink-400)'],
    ['--text-primary', 'var(--ink-100)'],
    ['--text-secondary', 'var(--ink-300)'],
    ['--text-muted', 'var(--ink-350)'],
    ['--accent', 'var(--gold-500)'],
    ['--accent-strong', 'var(--gold-300)'],
    ['--on-accent', 'var(--ink-950)'],
    ['--status-warning', 'var(--heat-3)'],
    ['--status-critical', 'var(--heat-6)'],
    ['--focus-ring-color', 'var(--gold-300)'],
    ['--focus-ring-width', '2px'],
    ['--focus-ring-offset', '2px'],
    ['--focus-ring-offset-color', 'var(--ink-950)'],
  ])('%s maps to %s', (name, value) => {
    expect(semantic.get(name)).toBe(value)
  })

  it('defines --focus-ring', () => {
    expect(semantic.has('--focus-ring')).toBe(true)
  })

  it('does not self-alias heat tokens (would be a cycle)', () => {
    for (let i = 0; i <= 8; i++) expect(semantic.has(`--heat-${i}`)).toBe(false)
  })
})

describe('Tailwind theme', () => {
  async function build(candidates: string[]): Promise<string> {
    const css = '@import "tailwindcss";\n@import "./styles/tailwind.theme.css";\n'
    const compiler = await compile(css, {
      base: resolve(WEB, 'src'),
      loadStylesheet: (id: string, base: string) => {
        const path =
          id === 'tailwindcss' ? resolve(WEB, 'node_modules/tailwindcss/index.css') : resolve(base, id)
        return Promise.resolve({ path, base: dirname(path), content: readFileSync(path, 'utf8') })
      },
    })
    return compiler.build(candidates)
  }

  it('compiles bg-surface-raised to var(--surface-raised)', async () => {
    const out = await build(['bg-surface-raised'])
    expect(out).toMatch(/\.bg-surface-raised\s*\{\s*background-color:\s*var\(--surface-raised\);?\s*\}/)
  })

  it('compiles heat utilities to the heat tokens', async () => {
    const out = await build(['bg-heat-4'])
    expect(out).toMatch(/\.bg-heat-4\s*\{\s*background-color:\s*var\(--heat-4\);?\s*\}/)
  })

  it('removes the default colour palette', async () => {
    const out = await build(['bg-red-500'])
    expect(out).not.toContain('.bg-red-500')
  })
})
