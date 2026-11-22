import { useEffect, useState } from 'react'
import { useUiStore } from '../state/uiStore'
import { ENTRANCE } from './presets'
import { DURATION_MS } from './tokens'
import { useReducedMotion } from './useReducedMotion'

/**
 * Page entrance choreography (Requirements 32.1–32.3, 35.1).
 *
 * One wave per page: the hero lockup, then the main visual, then the
 * secondary panels, each starting `ENTRANCE_OFFSET_MS` after the previous one.
 * The wave plays the first time a page is shown in a session; later visits
 * and reduced motion render the final state directly. A slot animates as one
 * block, so its children move with it and never stagger.
 */

export const ENTRANCE_SLOTS = ['hero', 'visual', 'secondary'] as const
export type EntranceSlot = (typeof ENTRANCE_SLOTS)[number]

/** Start-to-start offset between consecutive slots. */
export const ENTRANCE_OFFSET_MS = 60
/** Each slot's own duration, so the whole wave lasts `--dur-entrance`. */
export const ENTRANCE_SLOT_MS = DURATION_MS.entrance - ENTRANCE_OFFSET_MS * (ENTRANCE_SLOTS.length - 1)

export interface SlotTiming {
  readonly delayMs: number
  readonly durationMs: number
}

/** Delay and duration of each slot, in play order. */
export function entranceTimeline(): readonly SlotTiming[] {
  return ENTRANCE_SLOTS.map((_, i) => ({ delayMs: i * ENTRANCE_OFFSET_MS, durationMs: ENTRANCE_SLOT_MS }))
}

/** Time from the first slot's start to the last slot's end. */
export function entranceTotalMs(timeline: readonly SlotTiming[] = entranceTimeline()): number {
  return Math.max(0, ...timeline.map((t) => t.delayMs + t.durationMs))
}

/** Props spread onto a `motion.*` element. Empty when the entrance does not play. */
export interface EntranceSlotProps {
  readonly initial?: typeof ENTRANCE.hidden
  readonly animate?: typeof ENTRANCE.shown
  readonly transition?: { readonly duration: number; readonly delay: number; readonly ease: typeof ENTRANCE.ease }
  readonly 'data-entrance'?: EntranceSlot
}

export interface Entrance {
  /** True when this mount plays the entrance. */
  readonly playing: boolean
  /** Motion props for one slot of the wave. */
  slot(name: EntranceSlot): EntranceSlotProps
}

const STILL: EntranceSlotProps = {}

function slotProps(name: EntranceSlot): EntranceSlotProps {
  const timing = entranceTimeline()[ENTRANCE_SLOTS.indexOf(name)] as SlotTiming
  return {
    initial: ENTRANCE.hidden,
    animate: ENTRANCE.shown,
    transition: { duration: timing.durationMs / 1000, delay: timing.delayMs / 1000, ease: ENTRANCE.ease },
    'data-entrance': name,
  }
}

const PLAYING: Entrance = { playing: true, slot: slotProps }
const SETTLED: Entrance = { playing: false, slot: () => STILL }

/**
 * Entrance for `pageKey`. The decision is taken once per mount, so marking the
 * page as played does not cut the running wave short.
 */
export function useEntrance(pageKey: string): Entrance {
  const reduced = useReducedMotion()
  const [playing] = useState(() => !reduced && useUiStore.getState().entrancePlayed[pageKey] !== true)
  useEffect(() => {
    useUiStore.getState().markEntrancePlayed(pageKey)
  }, [pageKey])
  return playing && !reduced ? PLAYING : SETTLED
}
