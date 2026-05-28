/**
 * Bill row helpers + the single source of truth for marking bills paid.
 *
 * `commitMarkBillPaid` / `commitMarkBillsPaidList` are the only paths that should mutate a bill
 * from unpaid → paid. They handle: pay-from balance change (via `applySpend`), loan principal +
 * interest split for bills linked to a loan, and rotating recurring due dates forward.
 */
import { fmt, todayStr } from "./moneyFormat.js";
import { dueIn } from "./dateHelpers.js";
import { shiftRecurringBillDueDate } from "./billDueDates.js";
import { isLoanDebt, splitLoanPayment, applyLoanPaymentToDebtRow } from "./debtLogic.js";
import { normalizePaidFrom, resolveBillSpendIds } from "./accountsLogic.js";

/** True when due date is missing or not a valid YYYY-MM-DD (dueIn uses 999 as sentinel). */
export function isBillDueDateUnusable(dueDateStr) {
  return dueIn(dueDateStr) === 999;
}

/** YYYY-MM prefix from a bill's stored paidDate ("" if missing/invalid). */
export function billPaidDateCalendarPrefix(b) {
  const raw = b?.paidDate;
  if (raw == null || raw === "") return "";
  const s = typeof raw === "string" ? raw : String(raw);
  const day = s.includes("T") ? s.split("T")[0] : s;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(day.trim());
  if (!m) return "";
  return m[1] + "-" + String(parseInt(m[2], 10)).padStart(2, "0");
}

/** Sum of amounts due in calendar month `ms` (YYYY-MM) by bill due date. */
export function billsDueTotalInMonth(bills, ms) {
  return bills.reduce((s, b) => (b.dueDate?.startsWith(ms) ? s + (parseFloat(b.amount) || 0) : s), 0);
}

/** Sum of bills marked paid in calendar month `ms`: paidDate month, or legacy rows with no paidDate but due in ms. */
export function billsMarkedPaidTotalInMonth(bills, ms) {
  return bills.reduce((s, b) => {
    if (!b.paid) return s;
    const amt = parseFloat(b.amount) || 0;
    const pfx = billPaidDateCalendarPrefix(b);
    if (pfx && pfx === ms) return s + amt;
    if (!pfx && b.dueDate?.startsWith(ms)) return s + amt;
    return s;
  }, 0);
}

/** True if a bill has the loan snapshot fields needed to undo a loan-linked mark-paid. */
export function billHasLoanUndoSnap(b) {
  return !!(
    b?.linkedDebtId &&
    (parseFloat(b.loanPrincipalApplied) > 0 ||
      b.loanPrevInterestAsOfDate != null ||
      b.loanPrevAccruedInterest !== undefined)
  );
}

/**
 * After marking a recurring bill paid, it stays in Paid History until the next due is within this many days — then it
 * returns to Upcoming. Tuned per cadence (share of typical period as heads-up).
 */
export const RECURRING_RESHOW_UPCOMING_WITHIN_DAYS = {
  Weekly: 4,
  "Bi-weekly": 7,
  Monthly: 21,
  Quarterly: 30,
  Annual: 60,
};

export const BILL_RESHOW_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function clampBillReshowMultiplier(m) {
  const x = typeof m === "number" && Number.isFinite(m) ? m : parseFloat(m);
  if (!Number.isFinite(x) || x <= 0) return 1;
  return Math.min(3, Math.max(0.25, x));
}

export function nearestBillReshowPreset(m) {
  const v = clampBillReshowMultiplier(m);
  let best = BILL_RESHOW_PRESETS[2];
  let bd = Infinity;
  for (const p of BILL_RESHOW_PRESETS) {
    const d = Math.abs(p - v);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

export function recurringReshowUpcomingWithinDays(recurring, settings) {
  if (!recurring || recurring === "One-time") return 0;
  const base = RECURRING_RESHOW_UPCOMING_WITHIN_DAYS[recurring];
  const b = typeof base === "number" ? base : RECURRING_RESHOW_UPCOMING_WITHIN_DAYS.Monthly;
  const mult = clampBillReshowMultiplier(settings?.billReshowLeadMultiplier);
  return Math.max(0, Math.round(b * mult));
}

/** Move a recurring bill's due date back one period (inverse of marking paid). */
export function rewindRecurringDueDate(dueDateStr, recurring) {
  return shiftRecurringBillDueDate(dueDateStr, recurring, todayStr(), false);
}

/** Validate pay-from targets + compute loan principal split for marking a bill paid. */
export function prepareBillPaidTransition(x, debts, accounts, settings) {
  const r = resolveBillSpendIds(x, accounts, debts, settings);
  if (!r.ok) return { ok: false, msg: r.msg };
  const payDate = todayStr();
  const bamt = parseFloat(x.amount) || 0;
  const bpf = normalizePaidFrom(x.paidFrom);
  let pd = 0;
  let intPortion = 0;
  let accDays = 0;
  let billPrevSnap;
  let isLoanPay = false;
  let prevCarry = 0;
  let newCarry = 0;
  if (x.linkedDebtId) {
    const debt = debts.find((d) => String(d.id) === String(x.linkedDebtId));
    if (debt && isLoanDebt(debt)) {
      isLoanPay = true;
      billPrevSnap = debt.loanInterestAsOfDate;
      prevCarry = parseFloat(debt.loanAccruedInterest) || 0;
      const sp = splitLoanPayment(debt, bamt, payDate);
      pd = sp.principal;
      intPortion = sp.interest;
      accDays = sp.days;
      newCarry = sp.newAccruedCarryover;
    }
  }
  return { ok: true, r, bpf, bamt, payDate, pd, intPortion, accDays, billPrevSnap, isLoanPay, prevCarry, newCarry };
}

/** Patches one bill row after unpaid→paid (recurring advances due date + paid:true; one-time sets paid:true). */
export function patchBillForMarkingPaid(xx, x, payDate, pd, billPrevSnap, isLoanPay, prevCarry) {
  if (String(xx.id) !== String(x.id)) return xx;
  const loanClear = { loanPrincipalApplied: undefined, loanPrevInterestAsOfDate: undefined, loanPrevAccruedInterest: undefined };
  const loanSnap = isLoanPay && x.linkedDebtId
    ? { loanPrincipalApplied: pd, loanPrevInterestAsOfDate: billPrevSnap, loanPrevAccruedInterest: prevCarry }
    : null;
  if (xx.recurring && xx.recurring !== "One-time") {
    const nd = shiftRecurringBillDueDate(xx.dueDate, xx.recurring, xx.dueDate || todayStr(), true);
    return { ...xx, paid: true, dueDate: nd, paidDate: payDate, ...(loanSnap || loanClear) };
  }
  return { ...xx, paid: true, paidDate: payDate, ...(loanSnap || loanClear) };
}

/**
 * Mark an unpaid bill paid: applySpend, loan balance/anchor, bill row. Use from Bills, chat, or quick actions.
 * @returns {{ok:false,msg:string}|{ok:true,tip:string}} tip is suffix for toast/chat (principal + interest).
 */
export function commitMarkBillPaid(x, { debts, setDebts, setBills, accounts, settings, applySpend, onToast, skipToast, skipVibrate }) {
  if (x.paid) return { ok: false, msg: (x.name ? '"' + x.name + '" is' : "This bill is") + " already marked paid." };
  const prep = prepareBillPaidTransition(x, debts, accounts, settings);
  if (!prep.ok) return { ok: false, msg: prep.msg };
  const { r, bpf, bamt, payDate, pd, intPortion, accDays, billPrevSnap, isLoanPay, prevCarry, newCarry } = prep;
  if (applySpend && bamt) applySpend(bpf, bamt, r.cid, r.bid);
  if (isLoanPay && x.linkedDebtId)
    setDebts((p) =>
      p.map((d) => (String(d.id) === String(x.linkedDebtId) ? applyLoanPaymentToDebtRow(d, pd, payDate, newCarry) : d))
    );
  setBills((p) => p.map((xx) => patchBillForMarkingPaid(xx, x, payDate, pd, billPrevSnap, isLoanPay && !!x.linkedDebtId, prevCarry)));
  const tip =
    isLoanPay && x.linkedDebtId && (pd > 0 || intPortion > 0 || newCarry > 0.001)
      ? ` · ${fmt(pd)} principal + ${fmt(intPortion)} interest (${accDays}d)${newCarry > 0.001 ? " · " + fmt(newCarry) + " accrued pending" : ""}`
      : "";
  if (!skipToast && onToast) onToast("✓ Paid — " + x.name + tip);
  if (!skipVibrate) {
    try {
      navigator.vibrate && navigator.vibrate([30, 10, 30]);
    } catch {}
  }
  return { ok: true, tip };
}

/** Pay several bills in order using one debts snapshot chain (correct loan math per bill). */
export function commitMarkBillsPaidList(rows, { debts, setDebts, setBills, accounts, settings, applySpend, onToast, skipToast, skipVibrate }) {
  if (!rows.length) return { ok: true, tip: "" };
  let sim = debts;
  const preps = [];
  for (const x of rows) {
    if (x.paid) return { ok: false, msg: (x.name ? '"' + x.name + '" is' : "A selected bill is") + " already marked paid." };
    const prep = prepareBillPaidTransition(x, sim, accounts, settings);
    if (!prep.ok) return { ok: false, msg: prep.msg };
    preps.push({ x, prep });
    if (prep.isLoanPay && x.linkedDebtId) {
      sim = sim.map((d) =>
        String(d.id) === String(x.linkedDebtId) ? applyLoanPaymentToDebtRow(d, prep.pd, prep.payDate, prep.newCarry) : d
      );
    }
  }
  let runningDebts = debts;
  for (const { x, prep } of preps) {
    const { r, bpf, bamt, payDate, pd, newCarry, isLoanPay } = prep;
    if (applySpend && bamt) applySpend(bpf, bamt, r.cid, r.bid);
    if (isLoanPay && x.linkedDebtId) {
      runningDebts = runningDebts.map((d) =>
        String(d.id) === String(x.linkedDebtId) ? applyLoanPaymentToDebtRow(d, pd, payDate, newCarry) : d
      );
    }
  }
  setDebts(runningDebts);
  setBills((p) =>
    p.map((xx) => {
      const st = preps.find((s) => String(s.x.id) === String(xx.id));
      if (!st) return xx;
      const { x, prep } = st;
      return patchBillForMarkingPaid(xx, x, prep.payDate, prep.pd, prep.billPrevSnap, prep.isLoanPay && !!x.linkedDebtId, prep.prevCarry);
    })
  );
  const tip = preps
    .map(({ x, prep }) =>
      prep.isLoanPay && x.linkedDebtId && (prep.pd > 0 || prep.intPortion > 0 || prep.newCarry > 0.001)
        ? x.name + ": " + fmt(prep.pd) + " principal + " + fmt(prep.intPortion) + " interest"
        : ""
    )
    .filter(Boolean)
    .join(" · ");
  if (!skipToast && onToast) onToast("\u2705 Paid " + rows.length + " bill(s)" + (tip ? " \u2014 " + tip : ""));
  if (!skipVibrate) {
    try {
      navigator.vibrate && navigator.vibrate([30, 10, 30]);
    } catch {}
  }
  return { ok: true, tip };
}
