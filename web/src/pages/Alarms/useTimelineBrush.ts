import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { parseAlarmParams, updateAlarmParams } from '../../domain/alarmFilters'
import type { TimelineRange } from '../../charts/SeverityTimeline'

export interface TimelineBrushState {
  from: Date | undefined
  to: Date | undefined
  /** Writes the range to `?from=`/`?to=`, or removes both when `null` (Requirement 26.4). */
  onBrushChange: (range: TimelineRange | null) => void
}

/**
 * Binds the `SeverityTimeline` brush to the URL. Other params (`?sev=`,
 * `?ch=`, `?event=`, `?dev=` …) are preserved. Brushing replaces the history
 * entry so a drag does not flood the back stack.
 */
export function useTimelineBrush(): TimelineBrushState {
  const [params, setParams] = useSearchParams()
  const { from, to } = parseAlarmParams(params)
  const onBrushChange = useCallback(
    (range: TimelineRange | null) => {
      setParams(
        (prev) =>
          updateAlarmParams(prev, range ? { from: range.from, to: range.to } : { from: undefined, to: undefined }),
        { replace: true },
      )
    },
    [setParams],
  )
  return { from, to, onBrushChange }
}
