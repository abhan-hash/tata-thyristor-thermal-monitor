// Provider stack. Everything is passed in so tests can supply their own store,
// repository, query client and router.
import { QueryClientProvider } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { HistoryProvider } from './data/historyHooks'
import { TelemetryProvider } from './data/hooks'
import type { HistoryRepository } from './data/ports'
import type { TelemetryStore } from './data/store'
import type { AppRouter } from './routes'

export interface AppProps {
  readonly store: TelemetryStore
  readonly repository: HistoryRepository
  readonly queryClient: QueryClient
  readonly router: AppRouter
}

export default function App({ store, repository, queryClient, router }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <HistoryProvider repository={repository}>
        <TelemetryProvider store={store}>
          <RouterProvider router={router} />
        </TelemetryProvider>
      </HistoryProvider>
    </QueryClientProvider>
  )
}
