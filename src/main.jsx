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
