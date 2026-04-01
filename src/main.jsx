import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

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
  // One event on first production load so Sentry's Issues/onboarding sees traffic (delete/archive in Sentry if you want).
  if (import.meta.env.PROD) {
    try {
      if (!sessionStorage.getItem('fv_sentry_first_ping')) {
        sessionStorage.setItem('fv_sentry_first_ping', '1')
        Sentry.captureMessage('Trackfi: Sentry connected (first-load ping — safe to delete)')
      }
    } catch (_) {}
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
