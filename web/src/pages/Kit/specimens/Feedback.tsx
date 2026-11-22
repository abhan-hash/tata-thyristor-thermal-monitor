import { useState } from 'react'
import { ConnectionBanner } from '../../../kit/ConnectionBanner'
import { EmptyState, type EmptyStateKind } from '../../../kit/EmptyState'
import { GroupLabel, Groups, Specimen, SpecimenGrid, type ForcedState } from '../gallery'

const KINDS: readonly { kind: EmptyStateKind; label: string }[] = [
  { kind: 'no-data', label: 'No data · retry' },
  { kind: 'disconnected', label: 'Disconnected · link' },
  { kind: 'no-alarms', label: 'No alarms · no action' },
  { kind: 'error', label: 'Error · disabled action' },
]

const ACTION_STATES: readonly { label: string; force: ForcedState }[] = [
  { label: 'Action hover', force: 'hover' },
  { label: 'Action pressed', force: 'active' },
  { label: 'Action focus', force: 'focus' },
]

function actionFor(kind: EmptyStateKind) {
  if (kind === 'no-data') return { label: 'Retry', onAction: () => undefined }
  if (kind === 'disconnected') return { label: 'Go to overview', to: '/kit?section=empty-state' }
  if (kind === 'error') return { label: 'Reload panel', onAction: () => undefined, disabled: true }
  return undefined
}

export function EmptyStateSpecimen() {
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>Kinds</GroupLabel>
        <SpecimenGrid min="20rem">
          {KINDS.map(({ kind, label }) => {
            const action = actionFor(kind)
            return (
              <Specimen key={kind} label={label} align="stretch" stageClassName="!p-0">
                <EmptyState kind={kind} headingLevel={4} {...(action ? { action } : {})} />
              </Specimen>
            )
          })}
        </SpecimenGrid>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Action states</GroupLabel>
        <SpecimenGrid min="12rem">
          {ACTION_STATES.map((s) => (
            <Specimen key={s.label} label={s.label} force={s.force} stageClassName="py-6">
              <EmptyState
                kind="no-data"
                headingLevel={4}
                heading="Request failed"
                message="Try again in a moment."
                action={{ label: 'Retry', onAction: () => undefined }}
                className="!gap-3 !p-0 [&>svg]:hidden"
              />
            </Specimen>
          ))}
        </SpecimenGrid>
      </div>
    </Groups>
  )
}

export function ConnectionBannerSpecimen() {
  // Captured once so the "N s ago" counters start from a fixed offset.
  const [now] = useState(() => Date.now())
  return (
    <Groups>
      <Specimen label="Stale · counting since the last frame" align="stretch" stageClassName="!min-h-0 !p-0 overflow-hidden">
        <ConnectionBanner status="stale" lastFrameAt={now - 3000} className="w-full" />
      </Specimen>
      <Specimen label="Stale · no frame yet" align="stretch" stageClassName="!min-h-0 !p-0 overflow-hidden">
        <ConnectionBanner status="stale" lastFrameAt={null} className="w-full" />
      </Specimen>
      <Specimen label="Reconnecting · last frame received" align="stretch" stageClassName="!min-h-0 !p-0 overflow-hidden">
        <ConnectionBanner status="reconnecting" lastFrameAt={now - 42000} className="w-full" />
      </Specimen>
      <Specimen label="Live · renders nothing visible" align="stretch">
        <ConnectionBanner status="live" lastFrameAt={now} className="w-full" />
        <span className="text-center text-12 text-text-secondary">Only the empty live region is mounted.</span>
      </Specimen>
    </Groups>
  )
}
