/**
 * Pure(-ish) "apply spend / refund" implementations for the four supported
 * payment surfaces — checking, savings, credit card, "none" / track-only.
 *
 * The originals lived inline in `AppInner` as memoized callbacks that referred
 * to state via closure. Pulling them out lets us test the balance math
 * directly and keeps `App.jsx` focused on orchestration. We accept the
 * `accounts` snapshot plus React setters so the call sites stay one-liners
 * (`applySpend(pf, amt, ccId, baId)` after a tiny hook in App.jsx).
 *
 * Behavior intentionally preserved verbatim from the previous inline version:
 *   - `creditDebtId` only matters when `paidFrom === "credit"` and updates the
 *     matching debt row's balance.
 *   - `bankAccountId` targets a `cashAccounts` row when the user has multiple
 *     checking/savings; with subaccounts present but no id we no-op (the
 *     caller validates upstream).
 *   - Legacy `accounts.checking` / `accounts.savings` / `accounts.credit_card`
 *     scalars are only touched when the user has NO subaccounts.
 */
import { normalizePaidFrom, hasCashSubaccounts } from "./accountsLogic.js";
import { round2 } from "./loanSplit.js";

function mutateSubaccount(accounts, setAccounts, bankAccountId, kind, delta) {
  setAccounts((p) => {
    const ca = [...(p.cashAccounts || [])];
    const i = ca.findIndex(
      (x) => String(x.id) === String(bankAccountId) && x.kind === kind
    );
    if (i < 0) return p;
    const row = ca[i];
    const next = round2(parseFloat(row.balance || 0) + delta);
    ca[i] = { ...row, balance: String(next) };
    return { ...p, cashAccounts: ca };
  });
}

export function applySpendImpl(paidFrom, amount, creditDebtId, bankAccountId, accounts, setAccounts, setDebts) {
  const pf = normalizePaidFrom(paidFrom);
  const a = parseFloat(amount) || 0;
  if (a <= 0 || pf === "none") return;

  if (pf === "credit" && creditDebtId != null && creditDebtId !== "") {
    setDebts((p) =>
      p.map((d) =>
        String(d.id) === String(creditDebtId)
          ? { ...d, balance: String(round2(parseFloat(d.balance || 0) + a)) }
          : d
      )
    );
    return;
  }
  if (pf === "checking" && bankAccountId != null && bankAccountId !== "") {
    mutateSubaccount(accounts, setAccounts, bankAccountId, "checking", -a);
    return;
  }
  if (pf === "savings" && bankAccountId != null && bankAccountId !== "") {
    mutateSubaccount(accounts, setAccounts, bankAccountId, "savings", -a);
    return;
  }
  // Subaccounts exist but no specific id was passed — caller is responsible for
  // resolving an account id; we bail rather than touch the legacy scalar.
  if ((pf === "checking" || pf === "savings") && hasCashSubaccounts(accounts)) return;

  setAccounts((p) => {
    const n = { ...p };
    if (pf === "checking") n.checking = String(round2(parseFloat(p.checking || 0) - a));
    else if (pf === "credit") n.credit_card = String(round2(parseFloat(p.credit_card || 0) + a));
    else if (pf === "savings") n.savings = String(round2(parseFloat(p.savings || 0) - a));
    return n;
  });
}

export function applyRefundImpl(paidFrom, amount, creditDebtId, bankAccountId, accounts, setAccounts, setDebts) {
  const pf = normalizePaidFrom(paidFrom);
  const a = parseFloat(amount) || 0;
  if (a <= 0 || pf === "none") return;

  if (pf === "credit" && creditDebtId != null && creditDebtId !== "") {
    setDebts((p) =>
      p.map((d) =>
        String(d.id) === String(creditDebtId)
          ? { ...d, balance: String(round2(Math.max(0, parseFloat(d.balance || 0) - a))) }
          : d
      )
    );
    return;
  }
  if (pf === "checking" && bankAccountId != null && bankAccountId !== "") {
    mutateSubaccount(accounts, setAccounts, bankAccountId, "checking", +a);
    return;
  }
  if (pf === "savings" && bankAccountId != null && bankAccountId !== "") {
    mutateSubaccount(accounts, setAccounts, bankAccountId, "savings", +a);
    return;
  }
  if ((pf === "checking" || pf === "savings") && hasCashSubaccounts(accounts)) return;

  setAccounts((p) => {
    const n = { ...p };
    if (pf === "checking") n.checking = String(round2(parseFloat(p.checking || 0) + a));
    else if (pf === "credit") n.credit_card = String(round2(Math.max(0, parseFloat(p.credit_card || 0) - a)));
    else if (pf === "savings") n.savings = String(round2(parseFloat(p.savings || 0) + a));
    return n;
  });
}
