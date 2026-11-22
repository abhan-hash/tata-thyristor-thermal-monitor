import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { withSeed } from '../fixtures.ts'

/**
 * WCAG 2.1 A/AA audit with axe on every route (Requirements 39.1, 39.3), plus a short
 * keyboard sanity check that Tab reaches controls on `/` and `/drive` with a visible focus ring.
 *
 * Uses the plain Playwright `test`: axe relies on timers, which never fire under the shared
 * fixture's paused fake clock. Live pages run on real time with the fixed seed instead.
 */
const ROUTES = ['/', '/drive', '/alarms', '/trends', '/settings', '/about', '/kit'] as const

/** Real time for live pages to receive data and settle entrances before the audit. */
const WARMUP_MS = 2_000

for (const route of ROUTES) {
  test(`axe: ${route} has no WCAG 2.1 A/AA violations`, async ({ page }) => {
    await page.goto(withSeed(route))
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(WARMUP_MS)
    const results = await new AxeBuilder({ page })
      // Pure decoration (WCAG 1.4.3 exemption): aria-hidden ghost numerals on /about.
      .exclude('[data-a11y-decorative]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 8).map((n) => {
        const data = n.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined
        const colours = data?.fgColor ? ` (${data.fgColor} on ${data.bgColor ?? '?'}, ${String(data.contrastRatio)}:1)` : ''
        return `${n.html.slice(0, 120)}${colours}`
      }),
    }))
    expect(summary).toEqual([])
  })
}

for (const route of ['/', '/drive'] as const) {
  test(`keyboard: Tab on ${route} reaches controls with a visible focus ring`, async ({ page }) => {
    await page.goto(withSeed(route))
    await page.waitForLoadState('networkidle')
    const seen = new Set<string>()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
        const shadow = style.boxShadow !== 'none' && style.boxShadow !== ''
        return {
          key: `${el.tagName}:${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? ''}`,
          visibleRing: outline || shadow,
        }
      })
      expect(info, `Tab stop ${String(i + 1)} on ${route}`).not.toBeNull()
      if (info === null) return
      expect(info.visibleRing, `focus ring on ${info.key}`).toBe(true)
      seen.add(info.key)
    }
    expect(seen.size).toBeGreaterThan(3)
  })
}
