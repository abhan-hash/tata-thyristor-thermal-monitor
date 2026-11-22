// TanStack Query bindings for the HistoryRepository port (Requirement 8.2).
// Components read alarms, traces, daily peaks and wear only through these
// hooks, which read only through the repository from context. The caller
// supplies the QueryClientProvider (see main.tsx).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { createContext, createElement, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AlarmEvent, WearRecord } from '../domain/types'
import type { HistoryRepository } from './ports'

const HistoryContext = createContext<HistoryRepository | null>(null)

export interface HistoryProviderProps {
  readonly repository: HistoryRepository
  readonly children?: ReactNode
}

export function HistoryProvider({ repository, children }: HistoryProviderProps) {
  return createElement(HistoryContext.Provider, { value: repository }, children)
}

/** The repository from context. Throws outside a HistoryProvider. */
export function useHistoryRepository(): HistoryRepository {
  const repo = useContext(HistoryContext)
  if (repo === null) throw new Error('useHistoryRepository must be used inside <HistoryProvider>')
  return repo
}

export type AlarmQuery = Parameters<HistoryRepository['alarms']>[0]
export type Trace = Awaited<ReturnType<HistoryRepository['trace']>>
export type DailyPeakRow = Awaited<ReturnType<HistoryRepository['dailyPeaks']>>[number]

/** Query keys. Everything lives under `['history']`; alarm keys under `['history', 'alarms']`. */
export const historyKeys = {
  all: ['history'] as const,
  alarms: () => ['history', 'alarms'] as const,
  alarmList: (q: AlarmQuery) =>
    [
      'history',
      'alarms',
      {
        from: q.from.toISOString(),
        to: q.to.toISOString(),
        channels: q.channels ? [...q.channels].sort((a, b) => a - b) : null,
        severities: q.severities ? [...q.severities].sort() : null,
      },
    ] as const,
  trace: (eventId: string) => ['history', 'trace', eventId] as const,
  dailyPeaks: (days: number) => ['history', 'dailyPeaks', days] as const,
  wear: () => ['history', 'wear'] as const,
}

/** Alarm events matching the query (time range, optional channels and severities). */
export function useAlarmHistory(q: AlarmQuery): UseQueryResult<AlarmEvent[]> {
  const repo = useHistoryRepository()
  return useQuery({
    queryKey: historyKeys.alarmList(q),
    queryFn: () => repo.alarms(q),
  })
}

/** The Tj trace around one alarm event. Disabled while `eventId` is null. */
export function useTrace(eventId: string | null): UseQueryResult<Trace> {
  const repo = useHistoryRepository()
  return useQuery({
    queryKey: historyKeys.trace(eventId ?? ''),
    queryFn: () => {
      if (eventId === null) throw new Error('useTrace: no event id')
      return repo.trace(eventId)
    },
    enabled: eventId !== null,
    // Typed arrays are not plain data, so structural sharing cannot reuse them.
    structuralSharing: false,
    // A recorded trace never changes.
    staleTime: Infinity,
  })
}

/** Daily peak Tj per channel over the last `days` days. */
export function useDailyPeaks(days: number): UseQueryResult<DailyPeakRow[]> {
  const repo = useHistoryRepository()
  return useQuery({
    queryKey: historyKeys.dailyPeaks(days),
    queryFn: () => repo.dailyPeaks(days),
  })
}

/** Wear records and life projections per channel. */
export function useWear(): UseQueryResult<WearRecord[]> {
  const repo = useHistoryRepository()
  return useQuery({
    queryKey: historyKeys.wear(),
    queryFn: () => repo.wear(),
  })
}

export interface AcknowledgeVars {
  readonly eventId: string
  readonly user: string
}

/**
 * Acknowledges an alarm event. On success, the updated event is written into
 * every cached alarm list and the alarm queries are invalidated.
 */
export function useAcknowledge(): UseMutationResult<AlarmEvent, Error, AcknowledgeVars> {
  const repo = useHistoryRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, user }: AcknowledgeVars) => repo.acknowledge(eventId, user),
    onSuccess: async (updated) => {
      client.setQueriesData<AlarmEvent[]>({ queryKey: historyKeys.alarms() }, (list) =>
        list?.map((e) => (e.id === updated.id ? updated : e)),
      )
      await client.invalidateQueries({ queryKey: historyKeys.alarms() })
    },
  })
}
