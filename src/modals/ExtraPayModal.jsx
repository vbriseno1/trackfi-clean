/**
 * Quick "Make a Payment" sheet used from the Debt view.
 *
 * For credit cards the payment reduces `balance` directly. For loans we run it
 * through `splitLoanPayment` (actual/365 accrual) so the principal vs. interest
 * preview matches what will actually post — including any leftover accrued
 * interest that didn't fit inside the payment.
 *
 * Shows quick-tap amounts (min payment, $100/250/500, full pay-off) and a live
 * preview of the new balance + how much of the payment goes where.
 */
import React, { useState } from "react";
import { C, MF } from "../theme.js";
import { isLoanDebt, splitLoanPayment } from "../lib/debtLogic.js";
import { todayStr, fmt } from "../lib/moneyFormat.js";
import { round2 } from "../lib/loanSplit.js";

export default function ExtraPayModal({ debt, onConfirm, onClose }) {
  const [amt, setAmt] = useState("");
  const bal = parseFloat(debt?.balance || 0);
  const carry = isLoanDebt(debt) ? parseFloat(debt?.loanAccruedInterest) || 0 : 0;
  const owed = isLoanDebt(debt) ? bal + carry : bal;
  const minPay = parseFloat(debt?.minPayment || 0);
  const pay = parseFloat(amt) || 0;
  const payForSplit = isLoanDebt(debt) ? pay : Math.min(pay, bal);
  const sp = isLoanDebt(debt) && payForSplit > 0 ? splitLoanPayment(debt, payForSplit, todayStr()) : null;
  const principalApplied = sp ? sp.principal : Math.min(pay, bal);
  const newBal = Math.max(0, bal - principalApplied);
  const pctPaid = bal > 0 ? Math.min(100, (principalApplied / bal) * 100) : 0;
  const payoffAmt = isLoanDebt(debt) && owed > 0
    ? (() => { const s = splitLoanPayment(debt, 999999, todayStr()); return round2(s.principal + s.interest); })()
    : bal;
  const fullyPaid = newBal === 0 && (!isLoanDebt(debt) || !sp || sp.newAccruedCarryover <= 0.001);
  const quickAmts = [
    minPay > 0 && { l: "Min pmt", v: minPay },
    { l: "$100", v: 100 },
    { l: "$250", v: 250 },
    { l: "$500", v: 500 },
    { l: "Pay off", v: payoffAmt },
  ].filter(Boolean);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "24px 24px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -4px 40px rgba(10,22,40,.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 20px" }} />
        <div style={{ fontFamily: MF, fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 2 }}>Make a Payment</div>
        <div style={{ fontSize: 13, color: C.textLight, marginBottom: 20 }}>
          {debt?.name}
          {isLoanDebt(debt) && carry > 0.001 ? <> · {fmt(bal)} principal + {fmt(carry)} accrued interest ({fmt(owed)} owed)</> : <> · balance {fmt(bal)}</>}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {quickAmts.map((q) => (
            <button
              key={q.l}
              onClick={() => setAmt(String(q.v.toFixed(2)))}
              style={{
                padding: "7px 13px",
                borderRadius: 99,
                border: `1.5px solid ${Math.abs(pay - q.v) < 0.01 ? C.green : C.border}`,
                background: Math.abs(pay - q.v) < 0.01 ? C.greenBg : "#fff",
                color: Math.abs(pay - q.v) < 0.01 ? C.green : C.textMid,
                fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {q.l}{" · " + fmt(q.v)}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontWeight: 800, color: pay > 0 ? C.green : C.textMid, fontSize: 18 }}>$</span>
          <input
            autoFocus
            type="number"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Enter amount"
            style={{ width: "100%", border: `2px solid ${pay > 0 ? C.green : C.border}`, borderRadius: 14, padding: "15px 16px 15px 36px", fontSize: 22, fontFamily: MF, fontWeight: 800, color: pay > 0 ? C.green : C.text, outline: "none", boxSizing: "border-box", background: pay > 0 ? C.greenBg : C.surface, transition: "all .15s" }}
          />
        </div>

        {pay > 0 && (
          <div style={{ background: fullyPaid ? "#0A1628" : C.greenBg, border: `1px solid ${fullyPaid ? "#6366F1" : C.greenMid}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: newBal > 0 || !fullyPaid ? 8 : 0 }}>
              <span style={{ fontSize: 13, color: fullyPaid ? "rgba(255,255,255,.7)" : C.green, fontWeight: 600 }}>
                {fullyPaid ? "🎉 PAID OFF!" : newBal === 0 ? "Principal at $0 — accrued interest remains" : "New balance after payment"}
              </span>
              <span style={{ fontFamily: MF, fontWeight: 800, fontSize: 16, color: fullyPaid ? "#34D399" : C.green }}>{fmt(newBal)}</span>
            </div>
            {newBal > 0 && bal > 0 && (
              <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pctPaid.toFixed(1) + "%", background: C.green, borderRadius: 99, transition: "width .3s" }} />
              </div>
            )}
            {sp && payForSplit > 0 && (
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 6, lineHeight: 1.4 }}>
                Est. split: <strong style={{ color: C.text }}>{fmt(sp.principal)}</strong> principal · <strong style={{ color: C.text }}>{fmt(sp.interest)}</strong> to interest ({sp.days}d accrual, actual/365)
                {sp.newAccruedCarryover > 0.001 ? <> · <strong style={{ color: C.amber }}>{fmt(sp.newAccruedCarryover)}</strong> accrued still pending</> : null}
              </div>
            )}
            {!isLoanDebt(debt) && pay > bal && (
              <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>⚠ Payment exceeds balance — will pay off fully</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surface, color: C.textMid, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={() => { if (pay <= 0) return; onConfirm(isLoanDebt(debt) ? payForSplit : Math.min(pay, bal)); }}
            disabled={pay <= 0}
            style={{ flex: 2, padding: "14px", borderRadius: 14, border: "none", background: pay > 0 ? C.green : C.borderLight, color: pay > 0 ? "#fff" : C.textFaint, fontWeight: 800, fontSize: 15, cursor: pay > 0 ? "pointer" : "default", fontFamily: MF, transition: "all .15s" }}
          >
            {fullyPaid ? "Pay Off Debt 🎉" : "Confirm — " + fmt(isLoanDebt(debt) ? payForSplit : Math.min(pay, bal))}
          </button>
        </div>
      </div>
    </div>
  );
}
