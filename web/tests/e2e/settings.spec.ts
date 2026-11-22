import { expect, test } from '../fixtures.ts'

/**
 * Settings validation and the unsaved-changes flow (Requirements 28.4, 28.5,
 * 28.9, 41.5).
 */
test('an invalid band shows an inline error and disables Save', async ({ page }) => {
  await page.goto('/settings')
  const warning = page.getByLabel('Tj warning', { exact: true })
  await warning.fill('130')
  await expect(warning).toHaveAttribute('aria-invalid', 'true')
  await expect(warning).toHaveAccessibleDescription(/\S/)
  const bar = page.getByRole('region', { name: 'Unsaved changes' })
  await expect(bar).toBeVisible()
  await expect(bar.getByRole('button', { name: 'Save' })).toBeDisabled()
})

test('an edit shows the unsaved bar, leaving asks first, and Save persists across reload', async ({ page }) => {
  await page.goto('/settings')
  const bar = page.getByRole('region', { name: 'Unsaved changes' })
  await expect(bar).toHaveCount(0)

  await page.getByLabel('Tj warning', { exact: true }).fill('105')
  await expect(bar).toBeVisible()

  // Navigating away with a dirty draft opens the blocker; Stay keeps the draft.
  await page.getByRole('link', { name: 'ABOUT', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Leave without saving?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Stay' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page).toHaveURL((url) => url.pathname === '/settings')
  await expect(page.getByLabel('Tj warning', { exact: true })).toHaveValue('105')

  await bar.getByRole('button', { name: 'Save' }).click()
  await expect(bar).toHaveCount(0)

  await page.reload()
  await expect(page.getByLabel('Tj warning', { exact: true })).toHaveValue('105')
})
