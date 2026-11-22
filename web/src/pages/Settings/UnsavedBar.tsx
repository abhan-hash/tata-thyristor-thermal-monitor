import { cx } from '../../kit/controlStyles'
import { StatusIcon } from '../../kit/icons/StatusIcon'
import { CAPS, PRIMARY_BUTTON, SECONDARY_BUTTON } from './settingsUi'

export interface UnsavedBarProps {
  /** Number of fields with an inline error. Save stays disabled while above 0. */
  errorCount: number
  canSave: boolean
  onSave: () => void
  onDiscard: () => void
}

/**
 * Sticky bar shown while the draft differs from the saved settings
 * (Requirements 28.5, 28.6). Save is enabled iff the draft can be saved.
 */
export function UnsavedBar({ errorCount, canSave, onSave, onDiscard }: UnsavedBarProps) {
  const blocked = errorCount > 0
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 pt-6 pb-[max(var(--space-4),env(safe-area-inset-bottom))]">
      <div
        role="region"
        aria-label="Unsaved changes"
        data-part="unsaved-bar"
        className={cx(
          'pointer-events-auto relative flex flex-col gap-4 overflow-hidden rounded-[var(--crop-panel-radius)] border p-4',
          'sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-3 sm:pr-3 sm:pl-6',
          '[border-color:var(--line-strong)] [background-color:color-mix(in_srgb,var(--surface-raised)_92%,transparent)]',
          'shadow-[var(--crop-panel-shadow)] backdrop-blur-md',
        )}
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 [background-color:var(--accent)]" />
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
            <span className="absolute inset-0 rounded-pill [background-color:var(--accent)] opacity-40 motion-safe:animate-ping" />
            <span className="relative size-2.5 rounded-pill [background-color:var(--accent)]" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={cx(CAPS, 'm-0 text-11 [color:var(--text-primary)]')}>Unsaved changes</p>
            <p
              aria-live="polite"
              className={cx(
                'm-0 flex items-center gap-1.5 text-12 leading-snug',
                blocked ? '[color:var(--status-critical-text)]' : '[color:var(--text-secondary)]',
              )}
            >
              {blocked ? (
                <>
                  <StatusIcon status="critical" size={12} className="shrink-0" />
                  {errorCount === 1 ? '1 field needs fixing before you can save.' : `${errorCount} fields need fixing before you can save.`}
                </>
              ) : (
                'New thresholds apply to status and alarms as soon as you save.'
              )}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:flex">
          <button type="button" className={SECONDARY_BUTTON} onClick={onDiscard}>
            Discard
          </button>
          <button type="button" className={PRIMARY_BUTTON} disabled={!canSave} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
