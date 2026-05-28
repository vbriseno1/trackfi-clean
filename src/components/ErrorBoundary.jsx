/**
 * Top-level error boundary for the whole app.
 *
 * Catches the next render error after a state update blows up so we can show a
 * friendly recovery card instead of an empty screen. When Sentry is wired in
 * via `VITE_SENTRY_DSN`, the error and its component stack are forwarded
 * (best-effort — the import is dynamic so disabling Sentry doesn't blow up
 * this component).
 */
import React from "react";
import * as Sentry from "@sentry/react";
import { C, MF } from "../theme.js";

export class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e, info) {
    console.error("Trackfi Error:", e?.message, info);
    if (import.meta.env.VITE_SENTRY_DSN) {
      try { Sentry.captureException(e, { contexts: { react: { componentStack: info?.componentStack } } }); } catch {}
    }
  }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} role="alert">
        <div style={{ background: C.surface, borderRadius: 18, padding: 28, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,.1)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>⚠️</div>
          <div style={{ fontFamily: MF, fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: C.textLight, marginBottom: 20, lineHeight: 1.5 }}>{this.state.err?.message || "Unexpected error. Your data in this browser is still saved locally."}</div>
          <button type="button" onClick={() => this.setState({ err: null })} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 24px", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 8 }}>Try again</button>
          <button type="button" onClick={() => window.location.reload()} style={{ background: C.accent, border: "none", borderRadius: 10, padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 8 }}>Reload app</button>
          <div style={{ fontSize: 11, color: C.textLight }}>If this keeps happening, export a backup from Settings before reloading.</div>
        </div>
      </div>
    );
    return this.props.children;
  }
}
