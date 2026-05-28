/**
 * Recharts lazy-loading bridge.
 *
 * App.jsx dynamically `import("recharts")` so the initial bundle stays small,
 * then publishes the resolved module + load-failed flag + dark-mode flag onto
 * `RechartsContext`. Every chart-using view wraps its chart in `<RechartsReady
 * render={R => ...}/>` so it gets:
 *
 *   - a tasteful skeleton while the module is still loading,
 *   - a "couldn't load" notice if the dynamic import threw,
 *   - the recharts module itself otherwise.
 *
 * Keeping this in a tiny standalone component lets every view import from one
 * place without dragging in the rest of `App.jsx`.
 */
import React, { createContext, useContext, useMemo } from "react";
import { C, UI } from "../theme.js";
import { getChartTheme } from "../lib/chartTheme.js";

export const RechartsContext = createContext(null);

export function useChartTheme() {
  const ctx = useContext(RechartsContext);
  return ctx?.charts ?? getChartTheme(false);
}

export function TrackfiRechartsProvider({ mod, failed, dark, children }) {
  const value = useMemo(
    () => ({ mod, failed, dark: !!dark, charts: getChartTheme(!!dark) }),
    [mod, failed, dark]
  );
  return <RechartsContext.Provider value={value}>{children}</RechartsContext.Provider>;
}

/** Standard chart panel — title, optional subtitle, consistent padding and border. */
export function ChartPanel({ title, subtitle, children, style }) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: UI.radiusLg,
        border: `1px solid ${C.border}`,
        boxShadow: UI.shadow,
        padding: "16px 16px 12px",
        marginBottom: 14,
        ...style,
      }}
    >
      {title && (
        <div style={{ marginBottom: subtitle ? 4 : 12 }}>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: -0.2 }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      <div className="fv-chart-wrap">{children}</div>
    </div>
  );
}

export function RechartsReady({ minHeight, render }) {
  const ctx = useContext(RechartsContext);
  if (ctx?.failed) {
    const dk = !!ctx.dark;
    return (
      <div
        role="alert"
        style={{
          minHeight, width: "100%", borderRadius: 12,
          background: dk ? C.navyMid : C.surfaceAlt,
          border: `1px solid ${dk ? "rgba(255,255,255,.14)" : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "12px 14px", fontSize: 12, fontWeight: 600,
          color: dk ? "rgba(241,245,249,.9)" : C.textMid,
          textAlign: "center", lineHeight: 1.4,
        }}
      >
        Charts didn’t load. Refresh the page or check your connection.
      </div>
    );
  }
  if (!ctx?.mod) return <div className="fv-rechart-skel" style={{ minHeight, width: "100%", borderRadius: 12 }} aria-busy="true" />;
  return render(ctx.mod);
}
