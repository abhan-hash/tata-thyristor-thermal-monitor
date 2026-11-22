import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../fixtures.ts'

/**
 * Advances the frozen clock until `target` is visible. The mock History_Repository
 * schedules its 80–200 ms latency timer only once the lazy route has loaded or the
 * mutation has started, which can land after a single fixed `runFor` under load.
 */
async function runClockUntilVisible(page: Page, target: Locator): Promise<void> {
  await expect(async () => {
    await page.clock.runFor(250)
    await expect(target).toBeVisible({ timeout: 250 })
  }).toPass({ timeout: 10_000 })
}

/**
 * Keyboard-only acknowledge (Requirements 26.6–26.8, 41.5): Tab to an
 * Acknowledge button, Enter opens the inline confirmation with focus on
 * Confirm, Enter records it, and the row shows the user and time.
 */
test('acknowledges an alarm with the keyboard alone', async ({ page }) => {
  await page.goto('/alarms')
  const ackButtons = page.getByRole('button', { name: /^Acknowledge (?!all)/ })
  await runClockUntilVisible(page, ackButtons.first())

  let focusedName = ''
  for (let i = 0; i < 120 && !focusedName.startsWith('Acknowledge '); i++) {
    await page.keyboard.press('Tab')
    focusedName = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  }
  expect(focusedName).toMatch(/^Acknowledge (?!all)/)
  // Pin the row by its event id: focus moves on as the row changes state.
  const eventId = await page.evaluate(
    () => document.activeElement?.closest('[data-event-id]')?.getAttribute('data-event-id') ?? '',
  )
  expect(eventId).not.toBe('')
  const row = page.locator(`[data-event-id="${eventId}"]`)

  await page.keyboard.press('Enter')
  const confirm = row.getByRole('group', { name: 'Confirm acknowledgement' })
  await expect(confirm).toContainText(/Acknowledge as .+\?/)
  await expect(confirm.getByRole('button', { name: 'Confirm' })).toBeFocused()

  await page.keyboard.press('Enter')
  const record = row.getByTestId('ack-record')
  await runClockUntilVisible(page, record)
  await expect(record).toContainText(/ACK .+ · \d{2}:\d{2}/)
})
