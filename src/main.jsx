import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Service worker uses cache-first for .js; on localhost that can serve stale Vite modules → white screen.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister()
  })
  console.info('[Trackfi] Dev: service workers unregistered. If the page was blank, refresh once (⌘⇧R).')
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        setInterval(() => reg.update(), 60 * 60 * 1000)
      })
      .catch(() => {})
  })
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  })
  // Call from browser console so Sentry receives a real event (Issues stays empty until then).
  window.__TRACKFI_SENTRY_TEST__ = () => {
    Sentry.captureException(new Error('Trackfi Sentry test'))
  }
  if (import.meta.env.DEV) {
    console.info('[Trackfi] Sentry: run __TRACKFI_SENTRY_TEST__() in the console to verify')
  }
}

const tree = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  sentryDsn ? (
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 24, fontFamily: 'system-ui' }}>Something went wrong.</p>}>
      {tree}
    </Sentry.ErrorBoundary>
  ) : (
    tree
  ),
)
