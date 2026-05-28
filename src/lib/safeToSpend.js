/**
 * Safe-to-spend + payday cadence math, shared by Home dashboard, AI Log header, and Paycheck view.
 *
 * Heuristic:
 *   checking
 *   + pro-rated "other" income (freelance, rental, dividends, trading) until next pay
 *   - bills due before next pay (any unpaid bill with dueDate <= nextPayStr)
 *   - projected checking burn (MTD checking spend / day-of-month × days until next pay)
 *   - envelope reserve (remaining budget × pro-rated share of period)
 *   - $200 fixed cushion
 */
import { totalCheckingBalance } from "./cashAccounts.js";
import { sumMtdCheckingSpend } from "./accountsLogic.js";

const FIXED_CUSHION = 200;

/** One pay period after ISO date — matches PaycheckView cadence. */
export function advancePaydayIso(fromIso, payFreq) {
  const next = new Date(fromIso + "T00:00:00");
  if (payFreq === "Weekly") next.setDate(next.getDate() + 7);
  else if (payFreq === "Twice Monthly") {
    if (next.getDate() < 15) next.setDate(15);
    else next.setMonth(next.getMonth() + 1, 1);
  } else if (payFreq === "Monthly") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 14);
  return next.getFullYear() + "-" + String(next.getMonth() + 1).padStart(2, "0") + "-" + String(next.getDate()).padStart(2, "0");
}

/** Most recent scheduled payday on or before `beforeIso` (anchor = last payday on record). */
export function getLatestScheduledPaydayOnOrBefore(anchorIso, payFreq, beforeIso) {
  if (!anchorIso || !beforeIso) return null;
  let cur = anchorIso;
  const end = new Date(beforeIso + "T00:00:00");
  if (new Date(cur + "T00:00:00") > end) return null;
  let next = advancePaydayIso(cur, payFreq);
  let guard = 0;
  while (new Date(next + "T00:00:00") <= end && guard < 120) {
    cur = next;
    next = advancePaydayIso(cur, payFreq);
    guard++;
  }
  return cur;
}

/** Soft nudge: new pay period landed (by schedule) and user hasn't recorded/skipped this period yet. */
export function paycheckPeriodNeedsHandling(income, settings, todayIso) {
  const handled = String(settings?.paycheckNudgeLastHandledPeriod || "").trim();
  const primary = parseFloat(income?.primary || 0);
  if (!(primary > 0)) return { show: false, due: null };
  const anchor = String(income?.lastPayDate || "").trim();
  if (!anchor) return { show: false, due: null };
  const payFreq = income?.payFrequency || "Biweekly";
  const due = getLatestScheduledPaydayOnOrBefore(anchor, payFreq, todayIso);
  if (!due) return { show: false, due: null };
  if (todayIso < due) return { show: false, due };
  if (handled && due <= handled) return { show: false, due };
  return { show: true, due };
}

/**
 * Safe-to-spend: checking + pro-rated other income − bills before next pay − projected burn − envelope reserve − $200.
 * Returns the headline `sts` plus all the intermediate numbers so views can render breakdowns.
 */
export function computeSafeToSpend(accounts, income, bills, expenses, budgetGoals, now = new Date()) {
  const payFreq = income.payFrequency || "Biweekly";
  const payPeriodDays =
    payFreq === "Weekly" ? 7 : payFreq === "Biweekly" ? 14 : payFreq === "Twice Monthly" ? 15 : 30;
  const _now = now;
  const _tod = _now.getDate();
  const nextPayDate = (() => {
    if (income.lastPayDate) {
      const last = new Date(income.lastPayDate + "T00:00:00");
      const next = new Date(last);
      let safety = 0;
      while (next <= _now && safety < 60) {
        if (payFreq === "Weekly") next.setDate(next.getDate() + 7);
        else if (payFreq === "Twice Monthly") {
          if (next.getDate() < 15) next.setDate(15);
          else next.setMonth(next.getMonth() + 1, 1);
        } else if (payFreq === "Monthly") next.setMonth(next.getMonth() + 1);
        else next.setDate(next.getDate() + 14);
        safety++;
      }
      return next;
    }
    if (payFreq === "Twice Monthly") {
      return _tod < 15
        ? new Date(_now.getFullYear(), _now.getMonth(), 15)
        : new Date(_now.getFullYear(), _now.getMonth() + 1, 1);
    }
    if (payFreq === "Monthly") {
      return new Date(_now.getFullYear(), _now.getMonth() + 1, 1);
    }
    const d = new Date(_now);
    d.setDate(_now.getDate() + payPeriodDays);
    return d;
  })();
  const nextPayStr =
    nextPayDate.getFullYear() +
    "-" +
    String(nextPayDate.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(nextPayDate.getDate()).padStart(2, "0");
  const daysUntilNextPay = Math.max(1, Math.ceil((nextPayDate - _now) / 86400000));
  const billsBeforeNextPayAmt = bills.reduce((s, b) => {
    if (b.paid) return s;
    const d = b.dueDate || "";
    return d && d <= nextPayStr ? s + (parseFloat(b.amount) || 0) : s;
  }, 0);
  const envelopeMs = _now.getFullYear() + "-" + String(_now.getMonth() + 1).padStart(2, "0");
  const thisMonthExpChecking = sumMtdCheckingSpend(expenses, envelopeMs);
  const dom = _now.getDate();
  const burnRateChecking = dom > 0 ? thisMonthExpChecking / dom : 0;
  const projectedUntilPay = burnRateChecking * daysUntilNextPay;
  const envelopeReserve = (budgetGoals || []).reduce((s, g) => {
    const limit = parseFloat(g.limit || 0);
    if (!limit) return s;
    const spentCat = expenses
      .filter((e) => e.category === g.category && (e.date || "").startsWith(envelopeMs))
      .reduce((a, e) => a + (parseFloat(e.amount) || 0), 0);
    const remaining = Math.max(0, limit - spentCat);
    const dayFraction = Math.min(1, daysUntilNextPay / 30);
    return s + remaining * dayFraction;
  }, 0);
  const otherMonthly =
    (parseFloat(income.other || 0)) +
    (parseFloat(income.trading || 0)) +
    (parseFloat(income.rental || 0)) +
    (parseFloat(income.dividends || 0)) +
    (parseFloat(income.freelance || 0));
  const otherBeforeNextPay = otherMonthly * (daysUntilNextPay / 30);
  const checkingBalance = totalCheckingBalance(accounts);
  const sts = Math.max(
    0,
    checkingBalance + otherBeforeNextPay - billsBeforeNextPayAmt - projectedUntilPay - envelopeReserve - FIXED_CUSHION
  );
  return {
    sts,
    checkingBalance,
    billsBeforeNextPayAmt,
    projectedUntilPay,
    envelopeReserve,
    otherBeforeNextPay,
    otherMonthly,
    daysUntilNextPay,
    nextPayDate,
    nextPayStr,
    burnRateChecking,
    thisMonthExpChecking,
    envelopeMonthKey: envelopeMs,
    payFreq,
    payPeriodDays,
  };
}
