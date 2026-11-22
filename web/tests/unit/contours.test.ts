// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB = resolve(import.meta.dirname, '../..')
const COMMITTED = resolve(WEB, 'public/textures/contours.svg')

describe('generate-contours', () => {
  it('reproduces the committed texture byte for byte from the fixed seed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'contours-'))
    try {
      const out = join(dir, 'contours.svg')
      execFileSync(process.execPath, [resolve(WEB, 'scripts/generate-contours.mjs'), out])
      expect(readFileSync(out, 'utf8')).toBe(readFileSync(COMMITTED, 'utf8'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('contains only static line art (no scripts, no colour fills)', () => {
    const svg = readFileSync(COMMITTED, 'utf8')
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 1600 1000"/)
    expect(svg).not.toMatch(/<script|<image|href=/i)
    expect(svg).toContain('fill="none"')
    expect((svg.match(/<path /g) ?? []).length).toBeGreaterThan(10)
  })
})
