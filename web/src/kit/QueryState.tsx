import type { ReactNode } from 'react'
import { cx } from './controlStyles'
import { EmptyState } from './EmptyState'
import type { EmptyStateKind } from './EmptyState'

/** The part of a TanStack `UseQueryResult` this component reads. */
export interface QueryLike<T> {
  data: T | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  refetch: () => Promise<unknown>
}

export interface QueryEmptyCopy {
  /** Default `no-data`; use `no-alarms` for alarm lists. */
  kind?: Extract<EmptyStateKind, 'no-data' | 'no-alarms'>
  heading?: string
  message?: ReactNode
}

export interface QueryStateProps<T> {
  query: QueryLike<T>
  /** Rendered with the loaded data when it is not empty. */
  children: (data: T) => ReactNode
  /** Default: arrays with no items are empty; anything else is not. */
  isEmpty?: (data: T) => boolean
  /** Copy for the empty state. */
  empty?: QueryEmptyCopy
  /** Heading of the error state. Default "Could not load history". */
  errorHeading?: string
  /** Message of the error state. */
  errorMessage?: ReactNode
  /** Accessible name of the loading placeholder. Default "Loading". */
  loadingLabel?: string
  /** Heading level for the empty and error states. Default 3 (inside a panel). */
  headingLevel?: 2 | 3 | 4
  className?: string
}

export const RETRY_LABEL = 'Retry'
export const RETRYING_LABEL = 'Retrying'
export const QUERY_ERROR_HEADING = 'Could not load history'
export const QUERY_ERROR_MESSAGE = 'The history store did not answer. Other panels keep working. Retry to ask again.'

function defaultIsEmpty(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0
}

/**
 * Loading, error and empty states for one panel's history query
 * (Requirements 31.2, 31.3). A failed request shows an inline error
 * `EmptyState` whose Retry re-issues the request via `refetch`; the
 * failure stays inside this panel.
 */
export function QueryState<T>({
  query,
  children,
  isEmpty = defaultIsEmpty,
  empty,
  errorHeading = QUERY_ERROR_HEADING,
  errorMessage = QUERY_ERROR_MESSAGE,
  loadingLabel = 'Loading',
  headingLevel = 3,
  className,
}: QueryStateProps<T>) {
  if (query.isError) {
    const retrying = query.isFetching
    return (
      <div role="alert" data-query-state="error" className={className}>
        <EmptyState
          kind="error"
          heading={errorHeading}
          message={errorMessage}
          headingLevel={headingLevel}
          action={{
            label: retrying ? RETRYING_LABEL : RETRY_LABEL,
            disabled: retrying,
            onAction: () => {
              void query.refetch()
            },
          }}
        />
      </div>
    )
  }

  if (query.isPending || query.data === undefined) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={loadingLabel}
        data-query-state="loading"
        className={cx('flex min-h-24 items-center justify-center motion-safe:animate-pulse', className)}
      >
        <span aria-hidden="true" className="h-2 w-24 rounded-1 bg-line-subtle" />
      </div>
    )
  }

  const data = query.data
  if (isEmpty(data)) {
    return (
      <div data-query-state="empty" className={className}>
        <EmptyState
          kind={empty?.kind ?? 'no-data'}
          headingLevel={headingLevel}
          {...(empty?.heading !== undefined ? { heading: empty.heading } : {})}
          {...(empty?.message !== undefined ? { message: empty.message } : {})}
        />
      </div>
    )
  }

  return <>{children(data)}</>
}
