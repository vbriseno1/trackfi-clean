/**
 * Debt-row helpers: classify loans vs credit cards, sum owed with accrued carry, and
 * compute principal/interest splits for real loan payments (actual/365 via allocateLoanPayment).
 *
 * Payoff *projection* (avalanche/snowball) lives in `debtPayoffSim.js` and uses APR/12 monthly math.
 */
import { isCreditCardDebt } from "./creditCardTotals.js";
import { allocateLoanPayment, round2 } from "./loanSplit.js";
import { todayStr } from "./moneyFormat.js";

export function isLoanDebt(d) {
  return d && !isCreditCardDebt(d);
}

export function loanDebtsList(debts) {
  return (debts || []).filter(isLoanDebt);
}

/** Principal + accrued-interest carry for loans (matches paydown math). Credit cards: balance only. */
export function debtOwedForBreakdown(d) {
  const b = parseFloat(d?.balance) || 0;
  return b + (isLoanDebt(d) ? parseFloat(d?.loanAccruedInterest) || 0 : 0);
}

export function sumDebtsPrincipalAndAccrued(debts) {
  return (debts || []).reduce((s, d) => s + debtOwedForBreakdown(d), 0);
}

/** ~APR/12 × owed principal+accrual; not actual/365 — labeled as approximate in UI/copy. */
export function approxMonthlyInterestOnDebts(debts) {
  return (debts || []).reduce(
    (s, d) => s + debtOwedForBreakdown(d) * (parseFloat(d.rate || 0) / 100 / 12),
    0
  );
}

/** Original / starting balance for progress metrics: stable baseline, never shrinks with paydown. */
export function debtOriginalBaseline(d) {
  const b = parseFloat(d?.balance) || 0;
  const o = parseFloat(d?.original);
  if (Number.isFinite(o) && o > 0) return Math.max(o, b);
  return b;
}

/** Allocate loan payment: period interest + accrued carryover first, then principal (actual/365). */
export function splitLoanPayment(debt, payment, paymentDateStr) {
  return allocateLoanPayment({
    balance: debt?.balance,
    aprPercent: debt?.rate,
    payment,
    loanInterestAsOfDate: debt?.loanInterestAsOfDate,
    accruedInterestCarryover: debt?.loanAccruedInterest,
    paymentDateStr,
    fallbackPayDay: todayStr(),
  });
}

/** Returns a new debt row with principal applied, interest anchor moved, and any carryover stored/cleared. */
export function applyLoanPaymentToDebtRow(d, pd, payDate, newCarry) {
  const o = {
    ...d,
    balance: String(round2(Math.max(0, parseFloat(d.balance || 0) - pd))),
    loanInterestAsOfDate: payDate,
  };
  if (newCarry > 0.001) o.loanAccruedInterest = String(round2(newCarry));
  else delete o.loanAccruedInterest;
  return o;
}
