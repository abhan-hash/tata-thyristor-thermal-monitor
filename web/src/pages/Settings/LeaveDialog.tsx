import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { CropPanel } from '../../kit/CropPanel'
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './settingsUi'

export interface LeaveDialogProps {
  onStay: () => void
  onDiscard: () => void
}

/**
 * Confirmation shown when the router blocks navigation away from a dirty
 * draft (Requirement 28.9). Modal: focus starts on Stay, Tab cycles between
 * the two actions and Escape stays.
 */
export function LeaveDialog({ onStay, onDiscard }: LeaveDialogProps) {
  const titleId = useId()
  const bodyId = useId()
  const stayRef = useRef<HTMLButtonElement>(null)
  const discardRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    stayRef.current?.focus()
    return () => {
      previous?.focus()
    }
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onStay()
      return
    }
    if (e.key !== 'Tab') return
    const order = [stayRef.current, discardRef.current]
    const at = order.indexOf(document.activeElement as HTMLButtonElement | null)
    const next = order[(at + (e.shiftKey ? order.length - 1 : 1)) % order.length]
    e.preventDefault()
    next?.focus()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 [background-color:color-mix(in_srgb,var(--surface-page)_78%,transparent)] backdrop-blur-sm"
      onKeyDown={onKeyDown}
    >
      <CropPanel
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tone="raised"
        accentBrackets
        labels={[{ edge: 'top', text: 'Unsaved', align: 'start' }]}
        className="flex w-full max-w-lg flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="m-0 text-20 leading-tight font-bold [color:var(--accent)]">
            Leave without saving?
          </h2>
          <p id={bodyId} className="m-0 text-14 leading-snug [color:var(--text-secondary)]">
            Your threshold and display changes have not been saved. Discarding restores the last saved settings.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={discardRef} type="button" className={SECONDARY_BUTTON} onClick={onDiscard}>
            Discard and leave
          </button>
          <button ref={stayRef} type="button" className={PRIMARY_BUTTON} onClick={onStay}>
            Stay
          </button>
        </div>
      </CropPanel>
    </div>
  )
}
