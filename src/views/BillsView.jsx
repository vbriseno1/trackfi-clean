import React, { useState, useEffect, useRef } from "react";
import { Plus, CheckCircle2, Circle, Trash2, CalendarClock } from "lucide-react";
import { C, MF, FULL_MOS } from "../theme.js";
import { fmt } from "../lib/moneyFormat.js";
import { Empty } from "../components/ui.jsx";
import { normalizePaidFrom, resolveBillSpendIds } from "../lib/accountsLogic.js";
import {
  commitMarkBillPaid,
  commitMarkBillsPaidList,
  billHasLoanUndoSnap,
  billsDueTotalInMonth,
  billsMarkedPaidTotalInMonth,
  rewindRecurringDueDate,
} from "../lib/billsLogic.js";
import { dueIn, fmtDate } from "../lib/dateHelpers.js";
import { round2 } from "../lib/loanSplit.js";
import { notifSupported, notifPermission } from "../lib/notifications.js";

export default function BillsView({
  bills,
  setBills,
  setDebts,
  setEditItem,
  onAdd,
  showToast,
  showUndoToast,
  household,
  requestNotifPermission,
  applySpend,
  applyRefund,
  accounts,
  debts,
  settings,
}) {
  const [billTab, setBillTab] = useState("upcoming");
  const [notifPerm, setNotifPerm] = useState(() => notifPermission());
  const payingBillIdsRef = useRef(new Set());
  const bulkPayingRef = useRef(false);
  useEffect(() => {
    const paying = payingBillIdsRef.current;
    paying.forEach((id) => {
      const row = bills.find((b) => String(b.id) === String(id));
      if (row?.paid) paying.delete(id);
    });
  }, [bills]);
  const overdue = bills.filter((b) => !b.paid && dueIn(b.dueDate) < 0);
  const unpaid = bills.filter((b) => !b.paid);
  const paid = bills.filter((b) => b.paid);
  const totalMonthly = unpaid.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const totalPaid = paid.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const pctPaid = totalMonthly + totalPaid > 0 ? Math.round((totalPaid / (totalMonthly + totalPaid)) * 100) : 0;
  const soonAmt = bills
    .filter((b) => !b.paid && dueIn(b.dueDate) >= 0 && dueIn(b.dueDate) <= 7)
    .reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);

  function handleBillPaidChange(x, targetPaid) {
    const wasPaid = x.paid;
    const nowPaid = targetPaid;
    if (nowPaid === wasPaid) return;
    const bamt = parseFloat(x.amount) || 0;
    const bpf = normalizePaidFrom(x.paidFrom);
    if (nowPaid && !wasPaid) {
      const id = String(x.id);
      if (payingBillIdsRef.current.has(id)) return;
      payingBillIdsRef.current.add(id);
      const res = commitMarkBillPaid(x, {
        debts,
        setDebts,
        setBills,
        accounts,
        settings,
        applySpend,
        onToast: (msg) => setTimeout(() => showToast && showToast(msg), 0),
        skipToast: !showToast,
        skipVibrate: false,
      });
      if (!res.ok) {
        payingBillIdsRef.current.delete(id);
        showToast && showToast(res.msg, "error");
        return;
      }
      return;
    }
    if (!nowPaid && wasPaid) {
      const r = resolveBillSpendIds(x, accounts, debts, settings);
      if (!r.ok) {
        showToast && showToast(r.msg, "error");
        return;
      }
      if (applyRefund && bamt) applyRefund(bpf, bamt, r.cid, r.bid);
      const addBack = parseFloat(x.loanPrincipalApplied) || 0;
      if (x.linkedDebtId && (addBack > 0 || x.loanPrevInterestAsOfDate || x.loanPrevAccruedInterest !== undefined))
        setDebts((p) =>
          p.map((d) => {
            if (String(d.id) !== String(x.linkedDebtId)) return d;
            const o = { ...d };
            if (addBack > 0) o.balance = String(round2(parseFloat(d.balance || 0) + addBack));
            if (x.loanPrevInterestAsOfDate != null && x.loanPrevInterestAsOfDate !== "")
              o.loanInterestAsOfDate = x.loanPrevInterestAsOfDate;
            if (x.loanPrevAccruedInterest !== undefined) {
              const vc = parseFloat(x.loanPrevAccruedInterest) || 0;
              if (vc > 0.001) o.loanAccruedInterest = String(round2(vc));
              else delete o.loanAccruedInterest;
            }
            return o;
          })
        );
      setTimeout(() => showToast && showToast("Marked unpaid — " + x.name), 0);
      setBills((p) =>
        p.map((xx) => {
          if (String(xx.id) !== String(x.id)) return xx;
          const cleared = {
            ...xx,
            paid: false,
            paidDate: undefined,
            loanPrincipalApplied: undefined,
            loanPrevInterestAsOfDate: undefined,
            loanPrevAccruedInterest: undefined,
          };
          if (xx.recurring && xx.recurring !== "One-time")
            return { ...cleared, dueDate: rewindRecurringDueDate(xx.dueDate, xx.recurring) };
          return cleared;
        })
      );
    }
  }

  function undoLoanBillPayment(x) {
    const pr = parseFloat(x.loanPrincipalApplied) || 0;
    if (!x.linkedDebtId) return;
    const hasSnap = pr > 0 || x.loanPrevInterestAsOfDate != null || x.loanPrevAccruedInterest !== undefined;
    if (!hasSnap) return;
    const bamt = parseFloat(x.amount) || 0;
    const bpf = normalizePaidFrom(x.paidFrom);
    const r = resolveBillSpendIds(x, accounts, debts, settings);
    if (!r.ok) {
      showToast && showToast(r.msg, "error");
      return;
    }
    if (applyRefund && bamt) applyRefund(bpf, bamt, r.cid, r.bid);
    setDebts((p) =>
      p.map((d) => {
        if (String(d.id) !== String(x.linkedDebtId)) return d;
        const o = { ...d };
        if (pr > 0) o.balance = String(round2(parseFloat(d.balance || 0) + pr));
        if (x.loanPrevInterestAsOfDate != null && x.loanPrevInterestAsOfDate !== "")
          o.loanInterestAsOfDate = x.loanPrevInterestAsOfDate;
        if (x.loanPrevAccruedInterest !== undefined) {
          const vc = parseFloat(x.loanPrevAccruedInterest) || 0;
          if (vc > 0.001) o.loanAccruedInterest = String(round2(vc));
          else delete o.loanAccruedInterest;
        }
        return o;
      })
    );
    setBills((p) =>
      p.map((xx) => {
        if (String(xx.id) !== String(x.id)) return xx;
        const loanClear = {
          loanPrincipalApplied: undefined,
          loanPrevInterestAsOfDate: undefined,
          loanPrevAccruedInterest: undefined,
          paidDate: undefined,
        };
        if (xx.recurring && xx.recurring !== "One-time") {
          const prevDue = rewindRecurringDueDate(xx.dueDate, xx.recurring);
          return { ...xx, paid: false, dueDate: prevDue, ...loanClear };
        }
        return { ...xx, paid: false, ...loanClear };
      })
    );
    showToast && showToast("Undid loan payment — " + x.name);
  }

  function reversePaidBillEffects(x) {
    if (!x?.paid) return { reversed: false };
    const bamt = parseFloat(x.amount) || 0;
    const bpf = normalizePaidFrom(x.paidFrom);
    const r = resolveBillSpendIds(x, accounts, debts, settings);
    const canRefund = !!r.ok;
    if (canRefund && applyRefund && bamt) applyRefund(bpf, bamt, r.cid, r.bid);
    const addBack = parseFloat(x.loanPrincipalApplied) || 0;
    if (x.linkedDebtId && (addBack > 0 || x.loanPrevInterestAsOfDate || x.loanPrevAccruedInterest !== undefined))
      setDebts((p) =>
        p.map((d) => {
          if (String(d.id) !== String(x.linkedDebtId)) return d;
          const o = { ...d };
          if (addBack > 0) o.balance = String(round2(parseFloat(d.balance || 0) + addBack));
          if (x.loanPrevInterestAsOfDate != null && x.loanPrevInterestAsOfDate !== "")
            o.loanInterestAsOfDate = x.loanPrevInterestAsOfDate;
          if (x.loanPrevAccruedInterest !== undefined) {
            const vc = parseFloat(x.loanPrevAccruedInterest) || 0;
            if (vc > 0.001) o.loanAccruedInterest = String(round2(vc));
            else delete o.loanAccruedInterest;
          }
          return o;
        })
      );
    return { reversed: canRefund };
  }

  return (
    <div className="fu fv-view-root">
      {notifSupported() && notifPerm === "default" && bills.length > 0 && (
        <div
          style={{
            background: "rgba(99,102,241,.07)",
            border: "1px solid rgba(99,102,241,.2)",
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Get bill reminders</div>
            <div style={{ fontSize: 11, color: C.textMid }}>Notify you when bills are due or overdue</div>
          </div>
          <button
            type="button"
            className="ba"
            onClick={async () => {
              const r = await requestNotifPermission();
              setNotifPerm(r);
              if (r === "granted") showToast("Bill reminders enabled!");
              else showToast("Notifications not enabled", "error");
            }}
            style={{
              background: C.accent,
              border: "none",
              borderRadius: 10,
              padding: "7px 12px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Enable
          </button>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="fv-page-title">Bills</div>
          <div className="fv-page-sub">
            {unpaid.length} unpaid · {overdue.length} overdue
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {overdue.length > 0 && (
            <button
              type="button"
              className="ba"
              onClick={() => {
                if (bulkPayingRef.current) return;
                bulkPayingRef.current = true;
                const bad = overdue.filter((b) => !resolveBillSpendIds(b, accounts, debts, settings).ok);
                if (bad.length) {
                  bulkPayingRef.current = false;
                  showToast &&
                    showToast(
                      "Can't pay " + bad.length + " overdue — edit each bill to choose which card or bank account.",
                      "error"
                    );
                  return;
                }
                const res = commitMarkBillsPaidList(overdue, {
                  debts,
                  setDebts,
                  setBills,
                  accounts,
                  settings,
                  applySpend,
                  onToast: (msg) => setTimeout(() => showToast && showToast(msg), 0),
                  skipToast: !showToast,
                  skipVibrate: false,
                });
                if (!res.ok) {
                  bulkPayingRef.current = false;
                  showToast && showToast(res.msg, "error");
                  return;
                }
                setTimeout(() => {
                  bulkPayingRef.current = false;
                }, 750);
              }}
              style={{
                background: C.greenBg,
                border: `1px solid ${C.greenMid}`,
                borderRadius: 10,
                padding: "7px 12px",
                color: C.green,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Pay overdue
            </button>
          )}
          <button
            type="button"
            className="ba"
            onClick={onAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: C.accent,
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Plus size={13} />
            Add Bill
          </button>
        </div>
      </div>
      {bills.length > 0 && (
        <div
          style={{
            background: C.surface,
            borderRadius: 14,
            boxShadow: "0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",
            padding: "14px 16px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: C.textLight, marginBottom: 2 }}>Unpaid Bills</div>
            <div style={{ fontFamily: MF, fontWeight: 800, fontSize: 20, color: C.text }}>{fmt(totalMonthly)}</div>
            <div style={{ fontSize: 12, color: C.green, marginTop: 2 }}>
              {fmt(totalPaid)} paid · {fmt(totalMonthly + totalPaid)} total
            </div>
          </div>
          <div style={{ position: "relative", width: 56, height: 56 }}>
            <svg width="56" height="56" style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke={pctPaid > 0 ? C.greenBg : C.borderLight}
                strokeWidth="5"
                style={{ transition: "stroke .4s" }}
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke={pctPaid >= 80 ? C.green : pctPaid >= 40 ? C.accent : C.red}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pctPaid / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: C.text,
              }}
            >
              {pctPaid}%
            </div>
          </div>
        </div>
      )}
      {soonAmt > 0 && (
        <div
          style={{
            background: C.amberBg,
            border: `1px solid ${C.amberMid}`,
            borderRadius: 12,
            padding: "11px 15px",
            marginBottom: 14,
            fontSize: 13,
            color: C.amber,
            fontWeight: 500,
          }}
        >
          <strong>{fmt(soonAmt)}</strong> due in the next 7 days
        </div>
      )}
      {bills.length === 0 && (
        <Empty text='No bills yet. Use AI Logger — type "rent 1200 due 28th"' icon={CalendarClock} />
      )}
      {bills.length > 0 &&
        (() => {
          const upcomingBills = [...bills.filter((b) => !b.paid)].sort((a, b2) => new Date(a.dueDate) - new Date(b2.dueDate));
          const paidBills = [...bills.filter((b) => b.paid)].sort((a, b2) =>
            (b2.paidDate || b2.dueDate || "").localeCompare(a.paidDate || a.dueDate || "")
          );
          return (
            <div>
              <div style={{ display: "flex", background: C.borderLight, borderRadius: 10, padding: 3, marginBottom: 14 }}>
                {[
                  ["upcoming", "Upcoming (" + upcomingBills.length + ")"],
                  ["history", "Paid History (" + paidBills.length + ")"],
                ].map(([id, l]) => (
                  <button
                    key={id}
                    type="button"
                    className="ba"
                    onClick={() => setBillTab(id)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 8,
                      border: "none",
                      background: billTab === id ? C.surface : "transparent",
                      color: billTab === id ? C.accent : C.textLight,
                      fontWeight: billTab === id ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {billTab === "upcoming" && upcomingBills.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: C.textLight }}>All bills paid!</div>
              )}
              {(billTab === "upcoming" ? upcomingBills : paidBills).map((b) => {
                const d = dueIn(b.dueDate);
                const uc = b.paid ? C.green : d < 0 ? C.red : d <= 3 ? C.red : d <= 7 ? C.amber : C.textLight;
                const ul = b.paid
                  ? "Paid"
                  : d < 0
                    ? Math.abs(d) + "d overdue"
                    : d === 0
                      ? "Due today!"
                      : d <= 7
                        ? "Due in " + d + "d"
                        : "Due " + fmtDate(b.dueDate);
                return (
                  <div key={b.id} style={{ marginBottom: 8 }}>
                    <div
                      className="rw"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 14px",
                        background: C.surface,
                        border: `1.5px solid ${b.paid ? C.border : d < 0 ? C.redMid : d <= 7 ? C.amberMid : C.border}`,
                        borderRadius: 14,
                      }}
                    >
                      <button
                        type="button"
                        aria-label={b.paid ? `Mark ${b.name} unpaid` : `Mark ${b.name} paid`}
                        onClick={() => handleBillPaidChange(b, !b.paid)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: b.paid ? C.green : C.border,
                          padding: 0,
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        {b.paid ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: b.paid ? C.textLight : C.text,
                            textDecoration: b.paid ? "line-through" : "none",
                          }}
                        >
                          {b.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            marginTop: 2,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ color: uc, fontWeight: 500 }}>{ul}</span>
                          {b.recurring && b.recurring !== "One-time" && (
                            <span style={{ color: C.textLight }}>{b.recurring}</span>
                          )}
                          {b.linkedDebtId && (
                            <span style={{ color: C.accent, fontSize: 11, fontWeight: 600 }}> · loan payment</span>
                          )}
                          {b.linkedDebtId && !b.paid && (
                            <span style={{ fontSize: 10, color: C.textFaint, lineHeight: 1.35 }}>
                              {" "}
                              · pays period interest + accrued pending first, then principal (actual/365)
                            </span>
                          )}
                          {b.notes && <span style={{ color: C.textFaint, fontSize: 11 }}>· {b.notes}</span>}
                          {b.autoPay && (
                            <span
                              title="Label only — does not auto-mark paid or change balances."
                              style={{
                                background: C.accentBg,
                                color: C.accent,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 99,
                                cursor: "help",
                              }}
                            >
                              AUTO-PAY
                            </span>
                          )}
                          {household?.enabled &&
                            b.paidBy &&
                            b.paidBy !== "shared" &&
                            (() => {
                              const m = household.members.find((x) => x.id === b.paidBy);
                              return m ? (
                                <span
                                  style={{
                                    background: m.color + "18",
                                    color: m.color,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: 99,
                                    border: `1px solid ${m.color}33`,
                                  }}
                                >
                                  {m.emoji} {m.name}
                                </span>
                              ) : null;
                            })()}
                        </div>
                      </div>
                      <div style={{ fontFamily: MF, fontWeight: 700, fontSize: 16, color: b.paid ? C.textLight : C.text }}>
                        {fmt(b.amount)}
                      </div>
                      {billTab === "history" && b.paid && !billHasLoanUndoSnap(b) && (
                        <button
                          type="button"
                          className="ba"
                          onClick={() => handleBillPaidChange(b, false)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: C.amber,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 6px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Mark unpaid
                        </button>
                      )}
                      {billHasLoanUndoSnap(b) &&
                        ((billTab === "upcoming" && !b.paid) || (billTab === "history" && b.paid)) && (
                          <button
                            type="button"
                            className="ba"
                            onClick={() => undoLoanBillPayment(b)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: C.amber,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "4px 6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Undo loan pay
                          </button>
                        )}
                      <button
                        type="button"
                        className="ba"
                        onClick={() => setEditItem({ type: "bill", data: b })}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: C.textLight,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "4px 6px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="ba"
                        type="button"
                        aria-label={`Delete ${b.name}`}
                        onClick={() => {
                          const snap = b;
                          const rev = reversePaidBillEffects(snap);
                          setBills((p) => p.filter((x) => x.id !== snap.id));
                          const msg = snap.paid
                            ? rev.reversed
                              ? "Bill removed — payment reversed"
                              : "Bill removed — balances unchanged (pay-from no longer resolves)"
                            : "Bill removed";
                          if (snap.paid) {
                            showToast && showToast(msg, "error");
                          } else {
                            (showUndoToast || showToast) &&
                              (showUndoToast
                                ? showUndoToast(msg + " — " + snap.name, () => setBills((p) => [...p, snap]))
                                : showToast(msg, "error"));
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: C.textLight,
                          padding: "4px 3px",
                          display: "flex",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      {bills.length > 3 &&
        (() => {
          const now3 = new Date();
          const last6 = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now3.getFullYear(), now3.getMonth() - 5 + i, 1);
            const ms = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
            const dueTotal = billsDueTotalInMonth(bills, ms);
            const paidTotal = billsMarkedPaidTotalInMonth(bills, ms);
            const barTotal = Math.max(dueTotal, paidTotal);
            return {
              month: FULL_MOS[d.getMonth()].slice(0, 3),
              paid: paidTotal,
              due: dueTotal,
              barTotal,
              isCurrent: i === 5,
            };
          });
          if (!last6.some((m) => m.barTotal > 0)) return null;
          const maxB = Math.max(...last6.map((m) => m.barTotal)) || 1;
          return (
            <div
              style={{
                background: C.surface,
                borderRadius: 16,
                boxShadow: "0 1px 3px rgba(10,22,40,.06),0 2px 8px rgba(10,22,40,.04)",
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div style={{ fontFamily: MF, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>6-Month Bills</div>
              <div style={{ fontSize: 11, color: C.textLight, marginBottom: 12, lineHeight: 1.45 }}>
                Bar height is the larger of <strong>due that month</strong> vs <strong>marked paid that month</strong> (recurring
                payments use the month you tapped paid).
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 64 }}>
                {last6.map((m, i) => {
                  const hTotal = Math.max(4, Math.round((m.barTotal / maxB) * 56));
                  const hPaid = m.barTotal > 0 ? Math.round((m.paid / m.barTotal) * hTotal) : 0;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div
                        style={{
                          width: "100%",
                          height: hTotal,
                          background: C.borderLight,
                          borderRadius: "3px 3px 0 0",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            width: "100%",
                            height: hPaid,
                            background: m.isCurrent ? C.green : C.accent,
                            borderRadius: "3px 3px 0 0",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: m.isCurrent ? C.accent : C.textFaint,
                          fontWeight: m.isCurrent ? 700 : 400,
                        }}
                      >
                        {m.month}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: C.borderLight,
                      border: `1px solid ${C.border}`,
                    }}
                  />
                  <span style={{ color: C.textLight }}>Scale (due or paid)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: C.accent }} />
                  <span style={{ color: C.textLight }}>Marked paid</span>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
