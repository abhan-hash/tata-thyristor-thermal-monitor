import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '../fixtures.ts'
import { CAPTURE_ROUTES, routeSection, routeSlug } from './routes.ts'

const PHASE = process.env.PHASE ?? ''
if (!/^[A-Za-z0-9_-]+$/.test(PHASE)) {
  throw new Error('PHASE is required, e.g. `PHASE=1 npm run screenshots`')
}

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = path.join(WEB_ROOT, 'docs', 'screenshots', `phase-${PHASE}`)

for (const route of CAPTURE_ROUTES) {
  test(`capture ${route}`, async ({ page }, testInfo) => {
    const width = testInfo.project.use.viewport?.width
    if (width === undefined) throw new Error(`Project ${testInfo.project.name} has no viewport width`)

    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready.then(() => undefined))

    const file = path.join(OUT_DIR, `${routeSlug(route)}-${String(width)}.png`)
    const section = routeSection(route)
    if (section !== undefined) {
      // Kit section routes capture only that section (DOM id `kit-<id>`, see src/pages/Kit/sections.ts).
      await page.locator(`#kit-${section}`).screenshot({ path: file, animations: 'disabled' })
      return
    }
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
  })
}
