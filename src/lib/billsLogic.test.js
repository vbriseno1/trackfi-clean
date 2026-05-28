import { describe, expect, it, vi } from "vitest";
import { commitMarkBillPaid, commitMarkBillsPaidList, billsDueTotalInMonth, rewindRecurringDueDate } from "./billsLogic.js";
import { buildDemoLoadShell, DEMO_IDCHECK_PRIMARY } from "./demoSyncFixture.js";
import { generateDemoData } from "./demoData.js";
import { DEF_SETTINGS } from "./defaults.js";

function makeBillState(initialBills, initialDebts = []) {
  let bills = [...initialBills];
  let debts = [...initialDebts];
  const setBills = vi.fn((up) => {
    bills = typeof up === "function" ? up(bills) : up;
  });
  const setDebts = vi.fn((up) => {
    debts = typeof up === "function" ? up(debts) : up;
  });
  return {
    get bills() {
      return bills;
    },
    get debts() {
      return debts;
    },
    setBills,
    setDebts,
  };
}

describe("billsLogic with demo-shaped data", () => {
  const shell = buildDemoLoadShell();
  const accounts = shell.accounts;
  const settings = { ...DEF_SETTINGS, ...shell.settings };
  const demo = generateDemoData();

  it("marks an unpaid checking bill paid and updates balances via applySpend", () => {
    const bill = {
      id: 88001,
      name: "Test Electric",
      amount: "94",
      dueDate: "2026-12-15",
      paid: false,
      recurring: "Monthly",
      paidFrom: "checking",
      bankAccountId: String(DEMO_IDCHECK_PRIMARY),
      paidBy: "me",
    };
    const store = makeBillState([bill]);
    const applySpend = vi.fn();
    const res = commitMarkBillPaid(bill, {
      debts: store.debts,
      setDebts: store.setDebts,
      setBills: store.setBills,
      accounts,
      settings,
      applySpend,
      onToast: vi.fn(),
      skipToast: true,
      skipVibrate: true,
    });
    expect(res.ok).toBe(true);
    expect(applySpend).toHaveBeenCalledWith("checking", 94, undefined, String(DEMO_IDCHECK_PRIMARY));
    expect(store.bills[0].paid).toBe(true);
    expect(store.bills[0].paidDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects paying bill already marked paid", () => {
    const paid = { ...demo.bills[0], paid: true };
    const store = makeBillState([paid]);
    const res = commitMarkBillPaid(paid, {
      debts: demo.debts,
      setDebts: store.setDebts,
      setBills: store.setBills,
      accounts,
      settings,
      applySpend: vi.fn(),
      skipToast: true,
      skipVibrate: true,
    });
    expect(res.ok).toBe(false);
  });

  it("pays multiple overdue demo bills in one batch", () => {
    const overdue = demo.bills
      .filter((b) => !b.paid && b.paidFrom === "checking" && b.bankAccountId)
      .slice(0, 2)
      .map((b) => ({ ...b, paid: false }));
    if (overdue.length < 2) return;
    const store = makeBillState(overdue);
    const applySpend = vi.fn();
    const res = commitMarkBillsPaidList(overdue, {
      debts: demo.debts,
      setDebts: store.setDebts,
      setBills: store.setBills,
      accounts,
      settings,
      applySpend,
      skipToast: true,
      skipVibrate: true,
    });
    expect(res.ok).toBe(true);
    expect(applySpend).toHaveBeenCalledTimes(2);
    expect(store.bills.every((b) => b.paid)).toBe(true);
  });

  it("billsDueTotalInMonth sums due dates in month", () => {
    const ms = "2026-03";
    const total = billsDueTotalInMonth(demo.bills, ms);
    expect(total).toBeGreaterThan(0);
    const marchBills = demo.bills.filter((b) => b.dueDate?.startsWith(ms));
    const manual = marchBills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
    expect(total).toBeCloseTo(manual, 1);
  });

  it("rewindRecurringDueDate steps monthly bill back one period", () => {
    const next = rewindRecurringDueDate("2026-06-15", "Monthly");
    expect(next).toMatch(/^2026-05-/);
  });
});
