/**
 * Small, presentational UI primitives shared across the app.
 *
 * Keep these tiny and stateless (the form inputs own only their focus flag).
 * No business logic, no app state — that way every page reuses the same
 * "feel" without dragging in the giant App.jsx context.
 */
import React, { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, DollarSign } from "lucide-react";
import { C, MF, UI } from "../theme.js";

/** Shared input style used by FI/FS so focus + error states match exactly. */
export const iS = (focused, err) => ({
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  background: focused ? "#fff" : C.surfaceAlt,
  border: `1.5px solid ${err ? C.red : focused ? C.accent : C.border}`,
  borderRadius: 12,
  padding: "12px 14px",
  color: C.text,
  fontSize: 14,
  outline: "none",
  transition: "all .18s cubic-bezier(.22,1,.36,1)",
  boxSizing: "border-box",
  boxShadow: focused && !err ? `0 0 0 3px ${C.accent}18` : "none",
});

/** Form input with floating label + inline error. */
export function FI({ label, half, error, ...p }) {
  const [f, sf] = useState(false);
  const inputProps = label && p["aria-label"] == null ? { ...p, "aria-label": label } : p;
  return (
    <div
      className={half ? "modal-fi-half" : undefined}
      style={{ marginBottom: 14, flex: half ? "1 1 140px" : "1 1 100%", minWidth: 0, maxWidth: "100%" }}
    >
      {label && (
        <div style={{ fontSize: 11, fontWeight: 600, color: error ? C.red : C.slate, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5, overflowWrap: "anywhere" }}>
          {label}
          {error && <span style={{ marginLeft: 6, fontWeight: 500, textTransform: "none" }}>— {error}</span>}
        </div>
      )}
      <input {...inputProps} style={iS(f, error)} onFocus={() => sf(true)} onBlur={() => sf(false)} />
    </div>
  );
}

/** Form select. `options` may be strings or `{value,label}` objects. */
export function FS({ label, options, ...p }) {
  const [f, sf] = useState(false);
  const safeOpts = (options || []).filter((o) => o != null);
  const selectProps = label && p["aria-label"] == null ? { ...p, "aria-label": label } : p;
  return (
    <div style={{ marginBottom: 14, minWidth: 0, maxWidth: "100%" }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 }}>
          {label}
        </div>
      )}
      <select
        {...selectProps}
        style={{ ...iS(f), cursor: "pointer", appearance: "none", width: "100%", maxWidth: "100%" }}
        onFocus={() => sf(true)}
        onBlur={() => sf(false)}
      >
        <option value="">Select...</option>
        {safeOpts.map((o, i) => {
          const isObj = typeof o === "object" && o !== null && !Array.isArray(o);
          const val = isObj && Object.prototype.hasOwnProperty.call(o, "value") ? o.value : o;
          const disp = isObj && Object.prototype.hasOwnProperty.call(o, "label") && o.label != null && o.label !== "" ? o.label : String(val ?? "");
          const v = val != null ? String(val) : "";
          return (
            <option key={v + "-" + i} value={v}>
              {disp}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/** Bottom-sheet modal with optional submit button + inline error banner. */
export function Modal({ title, icon: Icon, onClose, onSubmit, submitLabel = "Save", accent = C.accent, children, wide, error }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(10,22,40,.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", animation: "fadeIn .2s ease" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: wide
            ? "min(640px, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right)))"
            : "min(480px, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right)))",
          minWidth: 0,
          boxSizing: "border-box",
          maxHeight: "min(92dvh, calc(100vh - env(safe-area-inset-top) - 8px))",
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 0 max(40px, env(safe-area-inset-bottom))",
          animation: "slideUp .26s cubic-bezier(.22,1,.36,1)",
          boxShadow: "0 -8px 40px rgba(15,23,42,.12)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName === "INPUT" && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
      >
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 99, margin: "14px auto 4px" }} />
        <div style={{ padding: "16px clamp(16px, 5vw, 24px) 20px", borderBottom: `1px solid ${C.borderLight}`, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            {Icon && (
              <div style={{ background: accent + "14", borderRadius: 12, padding: "9px 10px", display: "flex", flexShrink: 0 }}>
                <Icon size={20} color={accent} />
              </div>
            )}
            <span style={{ fontFamily: MF, fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: -0.3, overflowWrap: "anywhere" }}>{title}</span>
          </div>
          <button onClick={onClose} className="ba" style={{ background: C.surfaceAlt, border: "none", cursor: "pointer", color: C.textMid, padding: "7px 8px", borderRadius: 10, display: "flex" }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: "0 clamp(16px, 5vw, 24px)", minWidth: 0, boxSizing: "border-box" }}>
          {children}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "9px 13px", marginTop: 10, fontSize: 13, color: C.red, fontWeight: 500 }}>
              {error}
            </div>
          )}
          {onSubmit && (
            <button
              className="ba"
              onClick={onSubmit}
              style={{ width: "100%", background: accent, border: "none", borderRadius: UI.radius, padding: "14px 0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 16, boxShadow: `0 2px 8px ${accent}30` }}
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Horizontal progress bar — clamped 0–100. */
export function BarProg({ pct, color = C.accent, h = 5 }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: h, background: C.borderLight, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 99, transition: "width .5s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

/** Section header with vertical accent bar + optional Add button. */
export function SH({ title, sub, onAdd, addLabel = "Add", right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0, flex: 1 }}>
        <div style={{ width: 3, height: sub ? 38 : 26, background: C.accent, borderRadius: 99, marginTop: 2, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="fv-page-title" style={{ overflowWrap: "anywhere" }}>{title}</div>
          {sub && <div className="fv-page-sub" style={{ overflowWrap: "anywhere" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0, marginTop: 2 }}>
        {right}
        {onAdd && (
          <button className="ba" onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 5, background: C.accent, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <Plus size={12} />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Empty-state with icon + optional CTA. */
export function Empty({ text, icon: Icon = DollarSign, cta, onCta }) {
  return (
    <div style={{ textAlign: "center", padding: "52px 24px", animation: "fadeUp .3s ease" }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Icon size={22} color={C.textLight} strokeWidth={1.75} />
      </div>
      <div style={{ fontSize: 14, color: C.textMid, maxWidth: 220, margin: "0 auto 0", lineHeight: 1.6, fontWeight: 500 }}>{text}</div>
      {cta && (
        <button className="ba" onClick={onCta} style={{ marginTop: 16, background: C.accent, border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {cta}
        </button>
      )}
    </div>
  );
}

/** Mobile swipe-to-delete row wrapper. */
export function SwipeRow({ children, onDelete }) {
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(0);
  return (
    <div
      style={{ position: "relative", overflow: "hidden", marginBottom: 8 }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = startX.current - e.changedTouches[0].clientX;
        if (dx > 60) setSwiped(true);
        else if (dx < -20) setSwiped(false);
      }}
    >
      <div style={{ transform: swiped ? "translateX(-72px)" : "translateX(0)", transition: "transform .2s ease" }}>{children}</div>
      {swiped && (
        <div
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 68, display: "flex", alignItems: "center", justifyContent: "center", background: C.red, borderRadius: "0 14px 14px 0", cursor: "pointer" }}
          onClick={() => {
            onDelete();
            setSwiped(false);
          }}
        >
          <Trash2 size={18} color="#fff" />
        </div>
      )}
    </div>
  );
}

/** Accessible centered confirm dialog. Returns focus on unmount. */
export function ConfirmDialog({ title, message, onConfirm, onCancel, danger = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const prev = typeof document !== "undefined" ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      try {
        prev?.focus?.();
      } catch {}
    };
  }, []);
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,40,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: 20, animation: "fadeIn .15s ease" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        style={{ background: C.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 8px 40px rgba(0,0,0,.2)", animation: "slideUp .2s ease", outline: "none" }}
      >
        <div id="confirm-dialog-title" style={{ fontFamily: MF, fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          {title}
        </div>
        <div id="confirm-dialog-message" style={{ fontSize: 14, color: C.textLight, lineHeight: 1.5, marginBottom: 20 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, background: C.bg, borderRadius: 12, boxShadow: "0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)", padding: "12px 0", color: C.textMid, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, background: danger ? C.red : C.accent, border: "none", borderRadius: 12, padding: "12px 0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
