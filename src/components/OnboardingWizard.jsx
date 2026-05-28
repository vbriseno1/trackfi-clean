/**
 * First-run onboarding wizard. Collects profile, use case, income, and optional balances.
 * `onComplete(data)` — parent persists via applyOnboardingComplete (App.jsx).
 * `onTryDemo` — optional; loads full sample dataset and skips remaining steps.
 */
import React, { useState } from "react";
import {
  Wallet, Receipt, CalendarClock, CreditCard, Target, LineChart, Activity,
  User, Users, Home, UsersRound, Check, Sparkles, Landmark, PiggyBank, Shield,
  Lightbulb, ArrowRight, DollarSign,
} from "lucide-react";
import { C, MF } from "../theme.js";
import { PROFESSIONS, getProfession, getProfSub } from "../lib/professions.js";
import { fmt } from "../lib/moneyFormat.js";

const WELCOME_FEATURES = [
  { Icon: Receipt, title: "Track every dollar", sub: "Know where it all goes" },
  { Icon: CalendarClock, title: "Never miss a bill", sub: "Due dates + auto-pay tracking" },
  { Icon: CreditCard, title: "Crush debt faster", sub: "Avalanche & snowball plans" },
  { Icon: Target, title: "Build real savings", sub: "Goals with projected dates" },
  { Icon: LineChart, title: "Log your trades", sub: "P&L, win rate, equity curve" },
  { Icon: Activity, title: "Your health score", sub: "A–F grade on 5 pillars" },
];

const USE_CASES = [
  { id: "personal", Icon: User, title: "Just me", desc: "Track my own spending, bills, and goals" },
  { id: "couple", Icon: Users, title: "Couple / Partner", desc: "Share expenses with a partner — split bills, track together" },
  { id: "roommates", Icon: Home, title: "Roommates", desc: "Split household costs with one or more housemates" },
  { id: "family", Icon: UsersRound, title: "Family", desc: "Manage the whole household — kids, shared accounts" },
];

const ACCOUNT_ROWS = [
  { k: "checking", l: "Checking", Icon: Landmark, ph: "2500", req: true },
  { k: "savings", l: "Savings", Icon: PiggyBank, ph: "5000", req: false },
  { k: "cushion", l: "Emergency fund", Icon: Shield, ph: "1000", req: false },
];

function SelectCard({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ba fv-onb-select-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 16,
        width: "100%",
        minHeight: 56,
        border: `2px solid ${selected ? C.accent : C.border}`,
        background: selected ? C.accentBg : "#fff",
        cursor: "pointer",
        textAlign: "left",
        transition: "all .15s",
      }}
    >
      {children}
      {selected && (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          <Check size={13} color="#fff" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

export default function OnboardingWizard({ onComplete, onTryDemo }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => {
    const pn = localStorage.getItem("fv_pending_name") || "";
    return {
      name: pn,
      appName: "Trackfi",
      profCategory: "healthcare",
      profSub: "nurse_rn",
      useCase: "personal",
      income: {
        primary: "",
        other: "",
        trading: "",
        rental: "",
        dividends: "",
        freelance: "",
        payFrequency: "Biweekly",
      },
      accounts: { checking: "", savings: "", cushion: "", investments: "" },
    };
  });
  const sel = getProfession(d.profCategory);
  const firstName = (d.name || "").split(" ")[0].replace(/[^a-zA-Z]/g, "") || "";
  const payFreq = d.income?.payFrequency || "Biweekly";
  const liquidTotal =
    parseFloat(d.accounts?.checking || 0) +
    parseFloat(d.accounts?.savings || 0) +
    parseFloat(d.accounts?.cushion || 0);

  const finish = (payload) => {
    onComplete({
      ...payload,
      isTrader: parseFloat(payload.income?.trading || 0) > 0,
    });
  };

  const STEPS = [
    {
      title: null,
      body: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 0 16px" }}>
          <div className="fv-auth-logo" style={{ marginBottom: 14 }}>
            <Wallet size={26} strokeWidth={2} color="#fff" />
          </div>
          <div className="fv-page-title" style={{ marginBottom: 8 }}>Trackfi</div>
          <p className="fv-page-sub" style={{ marginBottom: 20, maxWidth: 400 }}>
            The finance app that works for your life — not just for spreadsheet people.
          </p>
          <div className="onb-feature-grid" style={{ marginBottom: 20, width: "100%" }}>
            {WELCOME_FEATURES.map(({ Icon, title, sub }) => (
              <div key={title} className="fv-card" style={{ padding: "12px 10px", textAlign: "left", boxShadow: "none" }}>
                <div className="fv-icon-tile" style={{ width: 36, height: 36, marginBottom: 8 }}>
                  <Icon size={18} color={C.accent} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{title}</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.textFaint }}>Your data stays on your device — sync to cloud anytime</div>
        </div>
      ),
      btnLabel: "Get started",
      canSkip: false,
    },

    {
      title: "A little about you",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Your name</div>
            <input
              autoFocus
              placeholder="Your name"
              value={d.name || ""}
              onChange={(e) => setD((p) => ({ ...p, name: e.target.value }))}
              style={{
                width: "100%",
                background: C.surfaceAlt,
                border: `1.5px solid ${d.name ? C.accent : C.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 16,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {firstName && (
              <div style={{ marginTop: 8, fontSize: 13, color: C.accent, fontWeight: 600 }}>Nice to meet you, {firstName}.</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>What do you do?</div>
            <div className="onb-prof-pick">
              {PROFESSIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ba fv-onb-chip"
                  onClick={() => setD((x) => ({ ...x, profCategory: p.id, profSub: p.subs[0].id }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "10px 14px",
                    borderRadius: 99,
                    minHeight: 44,
                    border: `1.5px solid ${d.profCategory === p.id ? C.accent : C.border}`,
                    background: d.profCategory === p.id ? C.accentBg : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: d.profCategory === p.id ? 700 : 500, color: d.profCategory === p.id ? C.accent : C.text }}>{p.label}</span>
                </button>
              ))}
            </div>
            {sel.subs.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Your role — {sel.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {sel.subs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="ba"
                      onClick={() => setD((x) => ({ ...x, profSub: s.id }))}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${d.profSub === s.id ? C.accent : C.border}`,
                        background: d.profSub === s.id ? C.accentBg : "#fff",
                        fontSize: 12,
                        fontWeight: d.profSub === s.id ? 700 : 400,
                        color: d.profSub === s.id ? C.accent : C.textMid,
                        cursor: "pointer",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ),
      btnLabel: "Continue",
      canSkip: false,
    },

    {
      title: "How will you use it?",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="fv-page-sub" style={{ marginBottom: 4 }}>This personalizes defaults and household mode.</p>
          {USE_CASES.map((opt) => (
            <SelectCard key={opt.id} selected={d.useCase === opt.id} onClick={() => setD((p) => ({ ...p, useCase: opt.id }))}>
              <div className="fv-icon-tile" style={{ flexShrink: 0 }}>
                <opt.Icon size={20} color={d.useCase === opt.id ? C.accent : C.textMid} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: d.useCase === opt.id ? C.accent : C.text, marginBottom: 2 }}>{opt.title}</div>
                <div style={{ fontSize: 12, color: C.textLight, lineHeight: 1.4 }}>{opt.desc}</div>
              </div>
            </SelectCard>
          ))}
          {(d.useCase === "couple" || d.useCase === "roommates" || d.useCase === "family") && (
            <div style={{ background: C.accentBg, border: `1px solid ${C.accentMid}`, borderRadius: 14, padding: "12px 14px", fontSize: 13, color: C.accent, lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Check size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                We&apos;ll enable <strong>Household mode</strong> — add members and tag shared expenses after setup.
              </span>
            </div>
          )}
        </div>
      ),
      btnLabel: "Continue",
      canSkip: false,
    },

    {
      title: firstName ? `What do you bring home, ${firstName}?` : "Your take-home income",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="fv-page-sub" style={{ marginBottom: 4 }}>
            Enter take-home <strong>per paycheck</strong> — we calculate the rest.
          </p>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Pay frequency</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Weekly", "Biweekly", "Twice Monthly", "Monthly"].map((f) => (
                <button
                  key={f}
                  type="button"
                  className="ba"
                  onClick={() => setD((p) => ({ ...p, income: { ...(p.income || {}), payFrequency: f } }))}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 99,
                    border: `1.5px solid ${payFreq === f ? C.accent : C.border}`,
                    background: payFreq === f ? C.accentBg : "#fff",
                    fontSize: 13,
                    fontWeight: payFreq === f ? 700 : 500,
                    color: payFreq === f ? C.accent : C.textMid,
                    cursor: "pointer",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Take-home per paycheck</div>
            <input
              type="number"
              placeholder="e.g. 2250"
              value={d.income?.primary || ""}
              onChange={(e) => setD((p) => ({ ...p, income: { ...(p.income || {}), primary: e.target.value } }))}
              style={{
                width: "100%",
                background: C.surfaceAlt,
                border: `1.5px solid ${parseFloat(d.income?.primary || 0) > 0 ? C.accent : C.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 22,
                fontFamily: MF,
                fontWeight: 700,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Other monthly income</div>
            <input
              type="number"
              placeholder="0"
              value={d.income?.other || ""}
              onChange={(e) => setD((p) => ({ ...p, income: { ...(p.income || {}), other: e.target.value } }))}
              style={{
                width: "100%",
                background: C.surfaceAlt,
                border: `1.5px solid ${C.border}`,
                borderRadius: 12,
                padding: "11px 14px",
                fontSize: 16,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {parseFloat(d.income?.primary || 0) > 0 && (
            <div className="fv-insight-card" style={{ borderColor: C.greenMid, background: C.greenBg }}>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 2 }}>Estimated annual ({payFreq})</div>
              <div style={{ fontFamily: MF, fontWeight: 800, fontSize: 20, color: C.green }}>
                $
                {Math.round(
                  parseFloat(d.income?.primary || 0) *
                    (payFreq === "Weekly" ? 52 : payFreq === "Twice Monthly" ? 24 : payFreq === "Monthly" ? 12 : 26) +
                    parseFloat(d.income?.other || 0) * 12
                ).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      ),
      btnLabel: "Continue",
      canSkip: true,
    },

    {
      title: "Starting balances",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {d.name && (
            <div className="fv-insight-card">
              <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 6 }}>Welcome, {d.name.split(" ")[0]}</div>
              <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
                {getProfSub(d.profCategory, d.profSub).label}
                {parseFloat(d.income?.primary || 0) > 0 && (
                  <>
                    {" · "}
                    {fmt(parseFloat(d.income.primary))} / {payFreq.toLowerCase()} paycheck
                  </>
                )}
              </div>
            </div>
          )}
          <p className="fv-page-sub" style={{ marginBottom: 8 }}>
            Optional — unlock net worth and safe-to-spend. You can add investment accounts later under Accounts.
          </p>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, marginBottom: 4 }}>Cash accounts</div>
          {ACCOUNT_ROWS.map((a) => (
            <div key={a.k} className="fv-card fv-onb-balance-row" style={{ boxShadow: "none" }}>
              <div className="fv-icon-tile" style={{ flexShrink: 0 }}>
                <a.Icon size={18} color={C.accent} strokeWidth={2} />
              </div>
              <div style={{ flex: "1 1 120px", minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.l}</div>
                {a.req && <div style={{ fontSize: 10, color: C.accent, fontWeight: 600 }}>Powers safe-to-spend</div>}
              </div>
              <input
                type="number"
                inputMode="decimal"
                placeholder={a.ph}
                value={d.accounts?.[a.k] || ""}
                onChange={(e) => setD((p) => ({ ...p, accounts: { ...(p.accounts || {}), [a.k]: e.target.value } }))}
                style={{
                  background: "#fff",
                  border: `1.5px solid ${parseFloat(d.accounts?.[a.k] || 0) > 0 ? C.accent : C.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 16,
                  fontFamily: MF,
                  fontWeight: 700,
                  color: C.text,
                  outline: "none",
                  textAlign: "right",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          <div className="fv-insight-card" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Lightbulb size={16} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
              Add 401(k), Roth IRA, brokerage, and crypto in <strong>Accounts &amp; income</strong> after setup.
            </span>
          </div>
          {liquidTotal > 0 && (
            <div style={{ background: C.accentBg, border: `1px solid ${C.accentMid}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: C.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <DollarSign size={16} />
              Liquid total: ${liquidTotal.toLocaleString()}
            </div>
          )}
        </div>
      ),
      btnLabel: "Launch Trackfi",
      canSkip: true,
    },
  ];

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fv-auth-shell fv-onb-shell"
      style={{
        minHeight: "100dvh",
        padding:
          "max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))",
      }}
    >
      <div className="fv-onb-card" style={{ background: C.surface }}>
        {step > 0 && (
          <div style={{ height: 4, background: C.borderLight, flexShrink: 0 }}>
            <div
              style={{
                height: "100%",
                width: `${(step / (STEPS.length - 1)) * 100}%`,
                background: C.accent,
                transition: "width .4s",
                borderRadius: 99,
              }}
            />
          </div>
        )}
        <div className="fv-onb-scroll">
          {step > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button type="button" className="ba" onClick={() => setStep((s) => s - 1)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: C.textMid, cursor: "pointer" }}>
                Back
              </button>
              <span style={{ fontSize: 12, color: C.textLight, fontWeight: 600 }}>
                Step {step} of {STEPS.length - 1}
              </span>
            </div>
          )}
          {cur.title && <div className="fv-page-title" style={{ marginBottom: 18 }}>{cur.title}</div>}
          {cur.body}
          <button
            type="button"
            className="fv-btn-primary ba"
            onClick={() => {
              if (isLast) finish(d);
              else setStep((s) => s + 1);
            }}
            style={{ justifyContent: "center", marginTop: 20, fontFamily: MF, gap: 8 }}
          >
            {cur.btnLabel}
            {!isLast && <ArrowRight size={16} strokeWidth={2.5} />}
          </button>
          {step === 0 && onTryDemo && (
            <button
              type="button"
              className="ba"
              onClick={onTryDemo}
              style={{
                width: "100%",
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: C.surfaceAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: C.textMid,
                cursor: "pointer",
              }}
            >
              <Sparkles size={16} color={C.accent} />
              Explore sample data
            </button>
          )}
          {cur.canSkip && !isLast && (
            <button type="button" className="ba" onClick={() => setStep((s) => s + 1)} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.textLight, fontSize: 13, cursor: "pointer", padding: "4px 0" }}>
              Skip for now
            </button>
          )}
          {cur.canSkip && isLast && (
            <button type="button" className="ba" onClick={() => finish(d)} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.textLight, fontSize: 13, cursor: "pointer", padding: "4px 0" }}>
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
