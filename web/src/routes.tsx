// Route table (Requirements 7.1, 22.3). `AppShell` is the persistent layout,
// so navigation never remounts the nav or the live store. Every page except
// Overview is lazy-loaded; Phase 3 registers the remaining routes here.
import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'
import { AppShell } from './kit/AppShell'

/** Shown by the router while a lazy route needed by the first URL is loading. */
function RouteLoading() {
  return null
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppShell,
    HydrateFallback: RouteLoading,
    children: [
      {
        path: 'kit',
        lazy: async () => {
          const { KitPage } = await import('./pages/Kit/KitPage')
          return { Component: KitPage }
        },
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

export type AppRouter = ReturnType<typeof createAppRouter>
