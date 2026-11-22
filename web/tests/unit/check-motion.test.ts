// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain ESM script without type declarations
import { checkMotion, isLayoutProperty } from '../../scripts/check-motion.mjs'

const check = checkMotion as (root: string) => string[]
const isLayout = isLayoutProperty as (name: string) => boolean

/* Animated-property limits (Requirement 34.1). */
describe('check-motion', () => {
  it('classifies layout properties', () => {
    for (const p of ['width', 'height', 'max-height', 'top', 'left', 'margin', 'marginTop', 'padding-left']) {
      expect(isLayout(p)).toBe(true)
    }
    for (const p of ['opacity', 'transform', 'scale', 'translate', 'fill', 'stop-color', 'filter', 'x']) {
      expect(isLayout(p)).toBe(false)
    }
  })

  it('passes on the app source', () => {
    expect(check(resolve(import.meta.dirname, '../..'))).toEqual([])
  })

  it('reports layout properties in CSS, Tailwind, Motion and Web Animations', () => {
    const root = mkdtempSync(join(tmpdir(), 'check-motion-'))
    try {
      mkdirSync(join(root, 'src'))
      writeFileSync(join(root, 'src/a.css'), '.a { transition: height 1s; }\n@keyframes k { to { left: 0; } }\n')
      writeFileSync(
        join(root, 'src/b.tsx'),
        "<motion.div animate={{ width: 4 }} className='transition-[margin]' />\nel.animate([{ top: 0 }])\n",
      )
      expect(check(root)).toHaveLength(5)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
