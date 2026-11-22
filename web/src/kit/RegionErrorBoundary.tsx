import { Component, Fragment } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export interface RegionErrorBoundaryProps {
  /** Names the region in `data-region`, e.g. "bridge", "page". */
  region: string
  children?: ReactNode
  /** Overrides the default error heading ("This panel stopped working"). */
  heading?: string
  /** Overrides the default error message. */
  message?: ReactNode
  /** Heading level of the fallback. Default 2. */
  headingLevel?: 2 | 3 | 4
  /** Label of the reload control. Default "Reload panel". */
  reloadLabel?: string
  /**
   * When any value changes (by `Object.is`), a failed region resets on its
   * own, e.g. pass the pathname so navigating away clears a page error.
   */
  resetKeys?: readonly unknown[]
  /** Called once per caught error, for logging. */
  onError?: (error: unknown, info: ErrorInfo) => void
  /** Called after the operator reloads the region. */
  onReset?: () => void
  className?: string
}

interface State {
  failed: boolean
  /** Bumped on reset so the subtree remounts with fresh state. */
  generation: number
}

export const RELOAD_LABEL = 'Reload panel'

function sameKeys(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
}

/**
 * Contains a render error to one region (Requirement 31.1). The region shows
 * an error `EmptyState` with a reload control; the shell and sibling regions
 * keep running. Reloading remounts the region's subtree.
 */
export class RegionErrorBoundary extends Component<RegionErrorBoundaryProps, State> {
  state: State = { failed: false, generation: 0 }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prev: RegionErrorBoundaryProps): void {
    if (this.state.failed && !sameKeys(prev.resetKeys, this.props.resetKeys)) this.reset()
  }

  reset = (): void => {
    this.setState((s) => ({ failed: false, generation: s.generation + 1 }))
    this.props.onReset?.()
  }

  render(): ReactNode {
    const { region, children, heading, message, headingLevel, reloadLabel, className } = this.props
    if (this.state.failed) {
      return (
        <div role="alert" data-region={region} data-region-state="error" className={className}>
          <EmptyState
            kind="error"
            {...(heading !== undefined ? { heading } : {})}
            {...(message !== undefined ? { message } : {})}
            {...(headingLevel !== undefined ? { headingLevel } : {})}
            action={{ label: reloadLabel ?? RELOAD_LABEL, onAction: this.reset }}
          />
        </div>
      )
    }
    return <Fragment key={this.state.generation}>{children}</Fragment>
  }
}
