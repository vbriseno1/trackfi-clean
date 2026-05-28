/**
 * Local PIN lock + setup flow. The hashed PIN lives in localStorage under
 * `fv_pin_hash` (per device, not synced) — this is a UX convenience lock,
 * NOT real auth. Real auth is handled by Supabase in `lib/supabase.js`.
 */
import React, { useState } from "react";
import { Lock } from "lucide-react";
import { C, MF } from "../theme.js";
import { hashPIN } from "../lib/pinHash.js";

export function PINLock({ onUnlock, appName, darkMode }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  const bg = darkMode ? C.navy : C.bg;
  const surf = darkMode ? C.navyMid : C.surface;
  const txt = darkMode ? "rgba(255,255,255,.92)" : C.text;
  const muted = darkMode ? C.textLight : C.textLight;

  async function tryUnlock() {
    const h = await hashPIN(pin);
    if (h === null) {
      setError("PIN unavailable — check browser security settings.");
      return;
    }
    if (h === localStorage.getItem("fv_pin_hash")) {
      onUnlock();
      return;
    }
    setTries((t) => t + 1);
    setError(tries >= 2 ? "Too many attempts — wait 10s" : "Wrong PIN");
    setPin("");
    if (tries >= 2) setTimeout(() => setTries(0), 10000);
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: surf, borderRadius: 24, padding: 32, maxWidth: 340, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,.15)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Lock size={24} color={C.accent} />
        </div>
        <div style={{ fontFamily: MF, fontSize: 20, fontWeight: 800, color: txt, marginBottom: 4 }}>{appName || "Finance App"}</div>
        <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>Enter your PIN to continue</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ width: 14, height: 14, borderRadius: "50%", background: pin.length > i ? C.accent : "transparent", border: `2px solid ${pin.length > i ? C.accent : C.border}`, transition: "all .15s" }}
            />
          ))}
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && tries < 3 && tryUnlock()}
          style={{ width: "100%", background: darkMode ? C.navyMid : C.bg, border: `1.5px solid ${error ? C.red : C.border}`, borderRadius: 12, padding: "12px 16px", textAlign: "center", fontSize: 24, letterSpacing: 8, color: txt, outline: "none", marginBottom: 8 }}
          placeholder="••••"
          autoFocus
        />
        {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 8 }}>{error}</div>}
        <button
          onClick={tryUnlock}
          disabled={pin.length !== 4 || tries >= 3}
          style={{ width: "100%", background: pin.length === 4 && tries < 3 ? C.accent : C.border, border: "none", borderRadius: 12, padding: "13px 0", color: pin.length === 4 && tries < 3 ? "#fff" : C.textFaint, fontWeight: 700, fontSize: 16, cursor: pin.length === 4 && tries < 3 ? "pointer" : "default" }}
        >
          Unlock
        </button>
      </div>
    </div>
  );
}

export function PINSetup({ onSave, onCancel, darkMode }) {
  const [step, setStep] = useState("set");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const cur = step === "set" ? p1 : p2;
  const setCur = step === "set" ? setP1 : setP2;

  async function confirm() {
    if (p1 !== p2) {
      setErr("PINs don't match");
      setP2("");
      return;
    }
    const h = await hashPIN(p1);
    if (!h) {
      setErr("PIN unavailable — check browser security settings.");
      return;
    }
    try {
      localStorage.setItem("fv_pin_hash", h);
    } catch {}
    onSave();
  }

  return (
    <div style={{ background: darkMode ? C.navyMid : C.surface, borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: MF, fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>
        {step === "set" ? "Set PIN" : "Confirm PIN"}
      </div>
      <div style={{ fontSize: 13, color: C.textLight, marginBottom: 14 }}>
        {step === "set" ? "Choose a 4-digit PIN" : "Re-enter to confirm"}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ width: 12, height: 12, borderRadius: "50%", background: cur.length > i ? C.accent : "transparent", border: `2px solid ${cur.length > i ? C.accent : C.border}`, transition: "all .15s" }}
          />
        ))}
      </div>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={cur}
        onChange={(e) => {
          setCur(e.target.value.replace(/\D/g, ""));
          setErr("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (step === "set" && p1.length === 4) setStep("confirm");
            else if (step === "confirm" && p2.length === 4) confirm();
          }
        }}
        style={{ width: "100%", background: C.bg, border: `1.5px solid ${err ? C.red : C.border}`, borderRadius: 10, padding: "10px", textAlign: "center", fontSize: 22, letterSpacing: 6, color: C.text, outline: "none", marginBottom: 10 }}
        placeholder="••••"
        autoFocus
      />
      {err && <div style={{ fontSize: 12, color: C.red, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        {step === "confirm" && (
          <button
            onClick={() => {
              setStep("set");
              setP2("");
              setErr("");
            }}
            style={{ flex: 1, background: "transparent", border: "1px solid #d0d7de", borderRadius: 10, padding: "10px", color: C.textLight, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Back
          </button>
        )}
        <button
          onClick={() => {
            if (step === "set" && p1.length === 4) setStep("confirm");
            else if (step === "confirm" && p2.length === 4) confirm();
          }}
          disabled={cur.length !== 4}
          style={{ flex: 1, background: cur.length === 4 ? C.accent : C.border, border: "none", borderRadius: 10, padding: "10px", color: cur.length === 4 ? "#fff" : C.textFaint, fontWeight: 700, fontSize: 13, cursor: cur.length === 4 ? "pointer" : "default" }}
        >
          {step === "set" ? "Next" : "Set PIN"}
        </button>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: "transparent", border: "1px solid #d0d7de", borderRadius: 10, padding: "10px", color: C.textLight, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
