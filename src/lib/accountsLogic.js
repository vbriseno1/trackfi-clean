/**
 * Pay-from + bank-account resolution shared by expense entry, bill mark-paid, and AI Log.
 *
 * "paid-from" buckets:
 *   - checking → cash sub-account or legacy top-level checking
 *   - savings  → cash sub-account or legacy top-level savings
 *   - credit   → adds to a credit-card debt's balance
 *   - none     → categories only, no balance change (kept for tracking-only flows)
 *
 * Multi sub-account picks honor user defaults in `settings`, then auto-pick when there's
 * exactly one row of the chosen kind.
 */
import { cashAccountsByKind, totalCheckingBalance, totalSavingsBalance } from "./cashAccounts.js";
import { cardDebtsList } from "./creditCardTotals.js";
import { isLoanDebt } from "./debtLogic.js";

/** Where a spend hits: checking ↓, savings ↓, credit ↑ (owed), none = categories only. */
export function normalizePaidFrom(pf) {
  if (pf === "credit" || pf === "checking" || pf === "savings" || pf === "none") return pf;
  return "checking";
}

export const PAID_FROM_OPTIONS = ["checking", "credit", "savings", "none"];
export const PAID_FROM_FS_LABELS = {
  checking: "🏦 Checking (debit/cash)",
  credit: "💳 Credit card (adds to balance owed)",
  savings: "💰 Savings",
  none: "📋 Track only — no balance change",
};

/** MTD spend that affects checking cash flow (legacy rows without paidFrom count as checking). */
export function sumMtdCheckingSpend(expenses, ms) {
  return expenses
    .filter((e) => e.date?.startsWith(ms) && normalizePaidFrom(e.paidFrom) === "checking")
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
}

export function sumMtdByPaidFrom(expenses, ms) {
  const o = { checking: 0, credit: 0, savings: 0, none: 0 };
  expenses.forEach((e) => {
    if (!e.date?.startsWith(ms)) return;
    o[normalizePaidFrom(e.paidFrom)] += parseFloat(e.amount) || 0;
  });
  return o;
}

/** Same rules as MTD checking — one calendar day, YYYY-MM-DD. */
export function dayCheckingSpend(expenses, dateStr) {
  return expenses
    .filter((e) => e.date === dateStr && normalizePaidFrom(e.paidFrom) === "checking")
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
}

/** Once any sub-account exists under Accounts & Income, checking/savings spend must use a row of that kind. */
export function hasCashSubaccounts(accounts) {
  return ((accounts?.cashAccounts) || []).length > 0;
}

/** Balance-sheet assets for net worth (subaccount or legacy cash + other buckets + trading). */
export function totalAppAssets(accounts, tradingAccount) {
  const t = tradingAccount || {};
  return (
    totalCheckingBalance(accounts) +
    totalSavingsBalance(accounts) +
    (parseFloat(accounts.cushion || 0)) +
    (parseFloat(accounts.investments || 0)) +
    (parseFloat(accounts.k401 || 0)) +
    (parseFloat(accounts.roth_ira || 0)) +
    (parseFloat(accounts.brokerage || 0)) +
    (parseFloat(accounts.crypto || 0)) +
    (parseFloat(accounts.hsa || 0)) +
    (parseFloat(accounts.property || 0)) +
    (parseFloat(accounts.vehicles || 0)) +
    (parseFloat(t.balance || 0))
  );
}

/** Resolves the user-set default checking/savings row id from Settings. Empty if none / single auto. */
export function pickDefaultBankAccountId(paidFrom, accounts, settings) {
  const pf = normalizePaidFrom(paidFrom);
  if (pf === "checking") {
    const list = cashAccountsByKind(accounts, "checking");
    if (list.length === 0) return "";
    if (list.length === 1) return String(list[0].id);
    const d = settings?.defaultCheckingAccountId;
    if (d && list.some((x) => String(x.id) === String(d))) return String(d);
    return "";
  }
  if (pf === "savings") {
    const list = cashAccountsByKind(accounts, "savings");
    if (list.length === 0) return "";
    if (list.length === 1) return String(list[0].id);
    const d = settings?.defaultSavingsAccountId;
    if (d && list.some((x) => String(x.id) === String(d))) return String(d);
    return "";
  }
  return "";
}

/** User-set default credit card (Settings). Single-card: returns that id; multiple: only if default matches a row. */
export function pickDefaultCreditDebtId(settings, debts) {
  const cards = cardDebtsList(debts);
  if (cards.length === 0) return "";
  if (cards.length === 1) return String(cards[0].id);
  const d = settings?.defaultCreditDebtId;
  if (d && cards.some((c) => String(c.id) === String(d))) return String(d);
  return "";
}

/**
 * Sub-account id for checking/savings: explicit row, else verified Settings default when multiple;
 * single row auto-picks. Legacy top-level only when `hasCashSubaccounts` is false.
 */
export function resolveBankAccountIdForExpense(paidFrom, explicitId, accounts, settings) {
  const pf = normalizePaidFrom(paidFrom);
  const ch = cashAccountsByKind(accounts, "checking");
  const sv = cashAccountsByKind(accounts, "savings");
  let eid = explicitId != null && String(explicitId).trim() !== "" ? String(explicitId) : "";
  if (pf === "checking") {
    if (ch.length === 0) return "";
    if (ch.length === 1) return String(ch[0].id);
    if (!eid && settings) eid = pickDefaultBankAccountId("checking", accounts, settings) || "";
    if (eid && ch.length && !ch.some((c) => String(c.id) === String(eid)))
      eid = settings ? pickDefaultBankAccountId("checking", accounts, settings) || "" : ""; // stale id → default
    return eid;
  }
  if (pf === "savings") {
    if (sv.length === 0) return "";
    if (sv.length === 1) return String(sv[0].id);
    if (!eid && settings) eid = pickDefaultBankAccountId("savings", accounts, settings) || "";
    if (eid && sv.length && !sv.some((c) => String(c.id) === String(eid)))
      eid = settings ? pickDefaultBankAccountId("savings", accounts, settings) || "" : "";
    return eid;
  }
  return "";
}

/** creditDebtId + bankAccountId for marking a bill paid / unpaying — matches expense rules. */
export function resolveBillSpendIds(bill, accounts, debts, settings) {
  const pf = normalizePaidFrom(bill?.paidFrom);
  const cards = cardDebtsList(debts);
  const ch = cashAccountsByKind(accounts, "checking");
  const sv = cashAccountsByKind(accounts, "savings");
  let cid;
  if (pf === "credit") {
    if (!cards.length) return { ok: false, msg: "Add a credit card under Debt (type: Credit card) first.", cid: undefined, bid: undefined };
    if (cards.length === 1) cid = String(cards[0].id);
    else {
      let id = bill?.creditDebtId ? String(bill.creditDebtId) : "";
      if (!id || !cards.some((c) => String(c.id) === id)) id = pickDefaultCreditDebtId(settings, debts);
      if (!id || !cards.some((c) => String(c.id) === id))
        return { ok: false, msg: "Open Edit on this bill and choose which card it pays from, or set a default card in Settings \u2192 Defaults.", cid: undefined, bid: undefined };
      cid = id;
    }
  }
  const bid = resolveBankAccountIdForExpense(pf, bill?.bankAccountId, accounts, settings);
  if (pf === "checking" && hasCashSubaccounts(accounts) && ch.length === 0)
    return { ok: false, msg: "Add a checking account under Accounts & Income, or change pay-from.", cid, bid: undefined };
  if (pf === "savings" && hasCashSubaccounts(accounts) && sv.length === 0)
    return { ok: false, msg: "Add a savings account under Accounts & Income, or change pay-from.", cid, bid: undefined };
  if (pf === "checking" && ch.length >= 2 && !bid)
    return { ok: false, msg: "Edit the bill and choose which checking account.", cid, bid: undefined };
  if (pf === "savings" && sv.length >= 2 && !bid)
    return { ok: false, msg: "Edit the bill and choose which savings account.", cid, bid: undefined };
  if (bill?.linkedDebtId) {
    const ld = (debts || []).find((d) => String(d.id) === String(bill.linkedDebtId));
    if (ld && isLoanDebt(ld) && pf === "credit")
      return { ok: false, msg: "Loan-linked bills use checking or savings so the loan balance updates when you mark paid.", cid: undefined, bid: undefined };
  }
  return { ok: true, cid, bid: bid || undefined };
}

/** Null if checking/savings paid-from can resolve a balance target; otherwise a user-facing error string. */
export function validateCashSpendPrerequisites(paidFrom, bankAccountId, accounts, settings) {
  const pf = normalizePaidFrom(paidFrom);
  if (pf !== "checking" && pf !== "savings") return null;
  const ch = cashAccountsByKind(accounts, "checking");
  const sv = cashAccountsByKind(accounts, "savings");
  const anyCa = hasCashSubaccounts(accounts);
  const bid = resolveBankAccountIdForExpense(pf, bankAccountId, accounts, settings);
  if (pf === "checking") {
    if (anyCa && ch.length === 0) return "Add a checking account under Accounts & Income.";
    if (ch.length >= 2 && !bid) return "Select which checking account, or set a default in Settings \u2192 Defaults.";
  }
  if (pf === "savings") {
    if (anyCa && sv.length === 0) return "Add a savings account under Accounts & Income.";
    if (sv.length >= 2 && !bid) return "Select which savings account, or set a default in Settings \u2192 Defaults.";
  }
  return null;
}

/** True if applyRefund can mirror the original spend targets (avoids legacy / wrong-bucket moves). */
export function canReverseExpenseBalance(paidFrom, creditDebtId, bankAccountId, accounts, debts, settings) {
  const pf = normalizePaidFrom(paidFrom);
  if (pf === "none") return true;
  if (pf === "credit") {
    const cards = cardDebtsList(debts);
    if (!cards.length) return false;
    const cid = creditDebtId != null && String(creditDebtId).trim() !== "" ? String(creditDebtId) : "";
    return !!(cid && cards.some((c) => String(c.id) === cid));
  }
  return validateCashSpendPrerequisites(pf, bankAccountId, accounts, settings) === null;
}

/** True if any non-trading balance > 0 (used to gate boot snapshots that would wipe a real account). */
export function accountsHasPositiveBalance(accounts) {
  if (totalCheckingBalance(accounts) > 0 || totalSavingsBalance(accounts) > 0) return true;
  for (const k of Object.keys(accounts || {})) {
    if (k === "cashAccounts" || k === "checking" || k === "savings") continue;
    if (parseFloat(accounts[k] || 0) > 0) return true;
  }
  return false;
}
