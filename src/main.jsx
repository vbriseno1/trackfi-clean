import * as Sentry from '@sentry/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Prod SW caches /assets with network-first (see public/sw.js). Dev still unregisters SW so Vite HMR isn’t stale.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister()
  })
  console.info('[Trackfi] Dev: service workers unregistered. If the page was blank, refresh once (⌘⇧R).')
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        const safeUpdate = () => {
          void reg.update().catch(() => {})
        }
        setInterval(safeUpdate, 60 * 60 * 1000)
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
    /** Vite HMR can briefly violate hook order or TDZ while a module is mid-swap; full reload fixes it. */
    beforeSend (event) {
      if (!import.meta.env.DEV) return event
      const msg = event.exception?.values?.[0]?.value ?? ''
      if (msg.includes('Rendered more hooks than during the previous render')) {
        return null
      }
      return event
    },
  })
  window.addEventListener('unhandledrejection', (event) => {
    const r = event.reason
    Sentry.captureException(r instanceof Error ? r : new Error(typeof r === 'string' ? r : 'Unhandled rejection'))
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

function SentryShellFallback () {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0f172a',
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Something went wrong</div>
        <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 20 }}>
          The app hit an unexpected error. Your data in this browser is usually still safe — try reloading.
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg,#6366f1,#0d9488)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Reload app
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  sentryDsn ? (
    <Sentry.ErrorBoundary fallback={<SentryShellFallback />}>
      {tree}
    </Sentry.ErrorBoundary>
  ) : (
    tree
  ),
)
