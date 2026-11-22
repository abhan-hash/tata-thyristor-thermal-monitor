// Route table (Requirements 7.1, 22.1–22.4). `AppShell` is the persistent
// layout, so navigation never remounts the nav or the live store. Overview is
// bundled with the shell; every other page is lazy-loaded. Unknown paths render
// an `EmptyState` with a link home.
import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'
import { AppShell } from './kit/AppShell'
import { NotFoundPage } from './pages/NotFound/NotFoundPage'
import { OverviewPage } from './pages/Overview/OverviewPage'

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
      { index: true, Component: OverviewPage },
      {
        path: 'drive',
        lazy: async () => {
          const { DriveDetailPage } = await import('./pages/DriveDetail/DriveDetailPage')
          return { Component: DriveDetailPage }
        },
      },
      {
        path: 'alarms',
        lazy: async () => {
          const { AlarmsPage } = await import('./pages/Alarms/AlarmsPage')
          return { Component: AlarmsPage }
        },
      },
      {
        path: 'trends',
        lazy: async () => {
          const { TrendsPage } = await import('./pages/Trends/TrendsPage')
          return { Component: TrendsPage }
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsPage } = await import('./pages/Settings/SettingsPage')
          return { Component: SettingsPage }
        },
      },
      {
        path: 'about',
        lazy: async () => {
          const { AboutPage } = await import('./pages/About/AboutPage')
          return { Component: AboutPage }
        },
      },
      {
        path: 'kit',
        lazy: async () => {
          const { KitPage } = await import('./pages/Kit/KitPage')
          return { Component: KitPage }
        },
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

export type AppRouter = ReturnType<typeof createAppRouter>
