/**
 * Modal that records a paycheck deposit into the user's checking account.
 *
 * - Defaults the amount to the user's primary take-home, and the date to the bill's
 *   triggering due date (or today) so the schedule anchor advances correctly.
 * - When `accounts.cashAccounts` has multiple checkings, the user picks which one.
 * - Also bumps `income.lastPayDate` (drives next-payday math) and
 *   `settings.paycheckNudgeLastHandledPeriod` (silences the in-app nudge for this cycle).
 *
 * `ctx` is the trigger context (typically `{ dueDate }` from the paycheck nudge);
 * passing null/undefined renders nothing — keeps this safe to mount unconditionally.
 */
import React, { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { C } from "../theme.js";
import { Modal, FI, FS } from "../components/ui.jsx";
import { cashAccountsByKind } from "../lib/cashAccounts.js";
import {
  pickDefaultBankAccountId,
  resolveBankAccountIdForExpense,
  validateCashSpendPrerequisites,
  hasCashSubaccounts,
} from "../lib/accountsLogic.js";
import { todayStr, fmt } from "../lib/moneyFormat.js";
import { round2 } from "../lib/loanSplit.js";

export default function PaycheckDepositModal({ ctx, onClose, accounts, income, settings, setAccounts, setIncome, setSettings, showToast }) {
  const [amt, setAmt] = useState("");
  const [payDate, setPayDate] = useState("");
  const [bankId, setBankId] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ctx) { setErr(""); return; }
    const ck = cashAccountsByKind(accounts, "checking");
    const def = pickDefaultBankAccountId("checking", accounts, settings) || "";
    setAmt(String(parseFloat(income.primary || 0) > 0 ? parseFloat(income.primary || 0) : ""));
    setPayDate(ctx.dueDate || todayStr());
    setBankId(def || (ck.length === 1 ? String(ck[0].id) : ""));
    setErr("");
  }, [ctx, income.primary, accounts, settings]);

  if (!ctx) return null;
  const ch = cashAccountsByKind(accounts, "checking");

  function submit() {
    setErr("");
    const a = parseFloat(amt) || 0;
    if (a <= 0) { setErr("Enter a valid deposit amount."); return; }
    if (hasCashSubaccounts(accounts) && ch.length === 0) {
      setErr("Add a checking account under Accounts & Income first.");
      return;
    }
    const cashE = validateCashSpendPrerequisites("checking", bankId, accounts, settings);
    if (cashE) { setErr(cashE); return; }
    const bid = resolveBankAccountIdForExpense("checking", bankId, accounts, settings);
    if (hasCashSubaccounts(accounts) && ch.length > 0 && !bid) {
      setErr("Select which checking account receives the deposit.");
      return;
    }
    if (bid) {
      setAccounts((p) => {
        const ca = [...(p.cashAccounts || [])];
        const i = ca.findIndex((x) => String(x.id) === String(bid) && x.kind === "checking");
        if (i >= 0) {
          const row = ca[i];
          ca[i] = { ...row, balance: String(round2(parseFloat(row.balance || 0) + a)) };
          return { ...p, cashAccounts: ca };
        }
        return p;
      });
    } else {
      setAccounts((p) => ({ ...p, checking: String(round2(parseFloat(p.checking || 0) + a)) }));
    }
    const anchor = (payDate && payDate.trim()) || (ctx.dueDate || todayStr());
    setIncome((p) => ({ ...p, lastPayDate: anchor }));
    setSettings((s) => ({ ...s, paycheckNudgeLastHandledPeriod: anchor }));
    showToast && showToast("Paycheck recorded — " + fmt(a) + " to checking");
    onClose();
  }

  return (
    <Modal title="Record paycheck deposit" icon={DollarSign} onClose={onClose} onSubmit={submit} submitLabel="Add to checking" accent={C.green} error={err}>
      <div style={{ fontSize: 13, color: C.textLight, lineHeight: 1.5, marginBottom: 14 }}>
        Deposits take-home into checking and sets your last payday to this date. Safe-to-spend and net worth follow your updated balance.
      </div>
      <FI label="Deposit amount ($)" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <FI label="Pay date (schedule anchor)" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
      {ch.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <FS
            label="Deposit to"
            options={ch.map((a) => ({ value: String(a.id), label: (a.name || "Checking") + " — " + fmt(parseFloat(a.balance || 0)) }))}
            value={String(bankId || "")}
            onChange={(e) => setBankId(e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
