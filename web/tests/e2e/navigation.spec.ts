import { expect, test } from '@playwright/test'
import { withSeed } from '../fixtures.ts'

/**
 * Navigation without a full document reload (Requirements 22.2, 41.5): every
 * Top_Nav link changes the route client-side, a window marker survives, the
 * navigation timing list keeps its single entry and the Top_Nav element is
 * the same node throughout.
 *
 * Uses the plain Playwright `test`: the shared fixture's fake clock replaces
 * `performance` with a stub whose `getEntriesByType` always returns [].
 */
const LINKS: readonly { name: string; path: string }[] = [
  { name: 'DRIVE', path: '/drive' },
  { name: 'ALARMS', path: '/alarms' },
  { name: 'TRENDS', path: '/trends' },
  { name: 'ABOUT', path: '/about' },
  { name: 'SETTINGS', path: '/settings' },
  { name: 'OVERVIEW', path: '/' },
]

test('nav links change route without reloading the document or remounting the Top_Nav', async ({ page }) => {
  await page.goto(withSeed('/'))
  await expect(page.locator('[data-part="top-nav"]')).toBeVisible()
  await page.evaluate(() => {
    const w = window as unknown as { __e2eMarker?: string }
    w.__e2eMarker = 'alive'
    const nav = document.querySelector('[data-part="top-nav"]') as (Element & { __e2eNav?: boolean }) | null
    if (nav) nav.__e2eNav = true
  })

  for (const { name, path } of LINKS) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === path)
    const state = await page.evaluate(() => ({
      marker: (window as unknown as { __e2eMarker?: string }).__e2eMarker,
      navEntries: performance.getEntriesByType('navigation').length,
      sameNav:
        (document.querySelector('[data-part="top-nav"]') as (Element & { __e2eNav?: boolean }) | null)?.__e2eNav ===
        true,
    }))
    expect(state, `after ${name}`).toEqual({ marker: 'alive', navEntries: 1, sameNav: true })
  }
})
