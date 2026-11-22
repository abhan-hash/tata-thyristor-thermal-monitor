/**
 * Selection_Hook (Requirements 17.5, 23.1, 23.2, 23.3).
 *
 * The selected channel lives in the URL as `?ch=T1`..`?ch=T6`, so it is
 * shareable, survives refresh and is the single source of truth for every
 * view. All writes use a `replace` navigation, so selecting does not grow the
 * history stack and never reloads the page.
 *
 * `/alarms` is an exception: there `?ch=` is a comma-list filter owned by
 * `domain/alarmFilters.ts`. On that path these hooks only read; they never
 * normalise or write `?ch=`.
 *
 * Call sites:
 * ```tsx
 * const { selected, select } = useChannelSelection()
 * <BridgeSchematic channels={…} selected={selected} onSelect={select} />
 * <RackRow label="T3" selected={selected === 3} onSelect={() => select(3)} />
 * ```
 */
import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { ChannelId } from '../domain/types'

export const CHANNEL_PARAM = 'ch'
export const DEFAULT_CHANNEL: ChannelId = 1

const TOKEN = /^T([1-6])$/

/** `"T3"` → 3; anything else (including `"t3"`, `"T7"`, `""`, null) → undefined. */
export function parseChannelParam(value: string | null | undefined): ChannelId | undefined {
  if (value == null) return undefined
  const m = TOKEN.exec(value)
  return m ? (Number(m[1]) as ChannelId) : undefined
}

/** 3 → `"T3"`. */
export function formatChannelParam(id: ChannelId): string {
  return `T${id}`
}

/** True on paths where `?ch=` belongs to another owner (the Alarms filter). */
export function isChannelParamForeign(pathname: string): boolean {
  return /^\/alarms(\/|$)/.test(pathname)
}

/**
 * Resolves the channel from search params. Valid only when there is exactly
 * one `ch` value and it is `T1`..`T6`; otherwise the default T1.
 */
export function resolveChannel(params: URLSearchParams): { channel: ChannelId; canonical: boolean } {
  const values = params.getAll(CHANNEL_PARAM)
  const parsed = values.length === 1 ? parseChannelParam(values[0]) : undefined
  return parsed === undefined
    ? { channel: DEFAULT_CHANNEL, canonical: false }
    : { channel: parsed, canonical: true }
}

/** Search string with `ch` set to `id`, other params preserved in order. */
export function withChannel(search: string, id: ChannelId): string {
  const next = new URLSearchParams(search)
  next.set(CHANNEL_PARAM, formatChannelParam(id))
  return `?${next.toString()}`
}

/**
 * The selected channel from `?ch=`. A missing or invalid value yields T1 and
 * the URL is rewritten to `?ch=T1` with `replace` (not on `/alarms`).
 */
export function useSelectedChannel(): ChannelId {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const { channel, canonical } = resolveChannel(new URLSearchParams(search))
  const foreign = isChannelParamForeign(pathname)
  const needsRewrite = !canonical && !foreign

  useEffect(() => {
    if (!needsRewrite) return
    void navigate(
      { pathname, search: withChannel(search, DEFAULT_CHANNEL), hash },
      { replace: true, preventScrollReset: true },
    )
  }, [needsRewrite, navigate, pathname, search, hash])

  return channel
}

/**
 * Returns `select(id)`, which writes `?ch=` with `replace` and keeps every
 * other param and the hash. A no-op on `/alarms`, where `?ch=` is the filter.
 */
export function useSelectChannel(): (id: ChannelId) => void {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  return useCallback(
    (id: ChannelId) => {
      if (isChannelParamForeign(pathname)) return
      const nextSearch = withChannel(search, id)
      if (nextSearch === search) return
      void navigate({ pathname, search: nextSearch, hash }, { replace: true, preventScrollReset: true })
    },
    [navigate, pathname, search, hash],
  )
}

/** `selected` and `select` together, shaped for BridgeSchematic and RackRow. */
export function useChannelSelection(): { selected: ChannelId; select: (id: ChannelId) => void } {
  return { selected: useSelectedChannel(), select: useSelectChannel() }
}
