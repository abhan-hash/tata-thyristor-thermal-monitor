import { test as base, expect } from '@playwright/test'

/** Fixed instant used by every Playwright test so clocks and timestamps are stable. */
export const FROZEN_TIME = new Date('2026-01-15T09:30:00.000Z')

/** Mock-data seed appended to every navigation. */
export const TEST_SEED = '1337'

/** Adds `seed=1337` to a URL or path unless a seed is already present. */
export function withSeed(url: string): string {
  const parsed = new URL(url, 'http://placeholder.invalid')
  if (!parsed.searchParams.has('seed')) {
    parsed.searchParams.set('seed', TEST_SEED)
  }
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(url)
  return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`
}

/**
 * Test fixture: installs a frozen clock before any page script runs and
 * rewrites `page.goto` so every navigation carries `?seed=1337`.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.install({ time: FROZEN_TIME })
    await page.clock.pauseAt(FROZEN_TIME)
    const goto = page.goto.bind(page)
    page.goto = (url, options) => goto(withSeed(url), options)
    await use(page)
  },
})

export { expect }
