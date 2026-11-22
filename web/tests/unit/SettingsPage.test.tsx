import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { statusFor } from '../../src/domain/status'
import { SettingsPage } from '../../src/pages/Settings/SettingsPage'
import { getThresholds, loadSettings, resetUiStore, SETTINGS_STORAGE_KEY, useUiStore } from '../../src/state/uiStore'

beforeEach(() => {
  localStorage.clear()
  resetUiStore()
})

function renderSettings() {
  const router = createMemoryRouter(
    [
      { path: '/settings', Component: SettingsPage },
      { path: '/about', element: <p>About page</p> },
    ],
    { initialEntries: ['/settings'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

function setNumber(label: string, value: number) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } })
}

const saveButton = () => screen.getByRole('button', { name: 'Save' })

describe('SettingsPage', () => {
  it('shows no unsaved bar while the draft matches the saved settings', () => {
    renderSettings()
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
  })

  it('shows an inline error on the offending field and disables Save', () => {
    renderSettings()
    setNumber('Tj warning', 130)
    const warning = screen.getByLabelText('Tj warning')
    expect(warning).toHaveAttribute('aria-invalid', 'true')
    expect(warning).toHaveAccessibleDescription(/.+/)
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('Save writes localStorage and changes status classification', async () => {
    renderSettings()
    expect(statusFor(105, getThresholds().junction_temp)).toBe('normal')
    setNumber('Tj warning', 100)
    expect(saveButton()).toBeEnabled()
    await userEvent.click(saveButton())
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull()
    expect(loadSettings().thresholds.junction_temp.warning).toBe(100)
    expect(statusFor(105, getThresholds().junction_temp)).toBe('warning')
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
  })

  it('Discard restores the saved settings', async () => {
    renderSettings()
    const before = screen.getByLabelText<HTMLInputElement>('Tj warning').value
    setNumber('Tj warning', 130)
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByLabelText<HTMLInputElement>('Tj warning').value).toBe(before)
    expect(screen.getByLabelText('Tj warning')).not.toHaveAttribute('aria-invalid')
    expect(useUiStore.getState().draft).toEqual(useUiStore.getState().saved)
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
  })

  it('confirms navigation away from a dirty draft: Stay keeps it, Discard leaves', async () => {
    const router = renderSettings()
    setNumber('Tj warning', 101)
    await act(() => router.navigate('/about'))
    expect(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/settings')
    expect(screen.getByLabelText<HTMLInputElement>('Tj warning').value).toBe('101')

    await act(() => router.navigate('/about'))
    await userEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))
    expect(await screen.findByText('About page')).toBeInTheDocument()
    expect(useUiStore.getState().draft).toEqual(useUiStore.getState().saved)
  })

  it('does not block navigation with a clean draft', async () => {
    const router = renderSettings()
    await act(() => router.navigate('/about'))
    expect(screen.getByText('About page')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
