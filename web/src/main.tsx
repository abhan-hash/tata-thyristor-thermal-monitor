import { QueryClient } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './index.css'
import App from './App.tsx'
import { createHistoryRepository, createTelemetrySource } from './data/createSource'
import { TelemetryStore } from './data/store'
import { createAppRouter } from './routes'
import { bindThresholds } from './state/uiStore'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

// Created once per page load, outside React, so StrictMode's double mount
// restarts the same store instead of creating a second one.
const store = new TelemetryStore(createTelemetrySource(import.meta.env))
// Saved Settings thresholds drive the alarm engine and apply on every save.
bindThresholds(store)
const repository = createHistoryRepository(import.meta.env)
const queryClient = new QueryClient()
const router = createAppRouter()

createRoot(rootElement).render(
  <StrictMode>
    {/* Motion follows the device's reduced-motion preference (Requirement 35). */}
    <MotionConfig reducedMotion="user">
      <App store={store} repository={repository} queryClient={queryClient} router={router} />
    </MotionConfig>
  </StrictMode>,
)
