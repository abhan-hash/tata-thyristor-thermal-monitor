import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures.ts'

/**
 * Channel selection sync (Requirements 23.2, 23.4, 41.5): selecting T3 on the
 * bridge writes `?ch=T3`, and the bridge highlight, Drive Detail readout,
 * charts and the Overview rack row all report T3. An invalid `?ch=` becomes T1.
 */
const bridgeDevices = (page: Page) => page.getByRole('group', { name: 'Thyristor bridge, 6-pulse' }).getByRole('button')
const currentRackRow = (page: Page) =>
  page.getByRole('navigation', { name: 'Thyristor channels' }).locator('button[aria-current]')

test('selecting T3 on the bridge syncs the readout, charts and rack row', async ({ page }) => {
  await page.goto('/drive?ch=T1')
  await expect(bridgeDevices(page)).toHaveCount(6)
  await page.getByRole('button', { name: /^T3,/ }).click()

  await expect(page).toHaveURL(/[?&]ch=T3(&|$)/)
  const pressed = bridgeDevices(page).and(page.locator('[aria-pressed="true"]'))
  await expect(pressed).toHaveCount(1)
  await expect(pressed).toHaveAttribute('data-channel', '3')
  await expect(page.getByRole('region', { name: 'T3 junction temperature' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'T3 live readings' })).toBeVisible()
  await expect(page.getByTestId('transient-chart')).toContainText('Tj T3')

  // Same URL on the Overview: the T3 rack row is the selected one.
  await page.goto(`/${new URL(page.url()).search}`)
  await expect(currentRackRow(page)).toHaveCount(1)
  await expect(currentRackRow(page)).toContainText('T3')
})

test('an invalid ?ch= is rewritten to T1', async ({ page }) => {
  await page.goto('/drive?ch=T9')
  await expect(page).toHaveURL(/[?&]ch=T1(&|$)/)
  await expect(page.getByRole('region', { name: 'T1 junction temperature' })).toBeVisible()
  await expect(bridgeDevices(page).and(page.locator('[aria-pressed="true"]'))).toHaveAttribute('data-channel', '1')
})
