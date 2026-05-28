import { describe, expect, it, vi } from "vitest";
import { applySpendImpl, applyRefundImpl } from "./accountMutations.js";

function makeSetters(initialAccounts, initialDebts = []) {
  let accounts = initialAccounts;
  let debts = initialDebts;
  const setAccounts = vi.fn((updater) => {
    accounts = typeof updater === "function" ? updater(accounts) : updater;
  });
  const setDebts = vi.fn((updater) => {
    debts = typeof updater === "function" ? updater(debts) : updater;
  });
  return {
    setAccounts,
    setDebts,
    get accounts() { return accounts; },
    get debts() { return debts; },
  };
}

describe("applySpendImpl", () => {
  it("no-ops on zero or negative amount", () => {
    const s = makeSetters({ checking: "100" });
    applySpendImpl("checking", 0, null, null, s.accounts, s.setAccounts, s.setDebts);
    applySpendImpl("checking", -10, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.setAccounts).not.toHaveBeenCalled();
  });

  it("no-ops when paidFrom is the 'none' track-only sentinel", () => {
    const s = makeSetters({ checking: "100" });
    applySpendImpl("none", 50, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.setAccounts).not.toHaveBeenCalled();
    expect(s.setDebts).not.toHaveBeenCalled();
  });

  it("decrements legacy scalar checking when no subaccounts present", () => {
    const s = makeSetters({ checking: "200", savings: "0", credit_card: "0" });
    applySpendImpl("checking", 50, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.checking).toBe("150");
  });

  it("decrements scalar savings when no subaccounts", () => {
    const s = makeSetters({ savings: "300" });
    applySpendImpl("savings", 75, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.savings).toBe("225");
  });

  it("increments scalar credit_card balance on credit spend", () => {
    const s = makeSetters({ credit_card: "100" });
    applySpendImpl("credit", 25, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.credit_card).toBe("125");
  });

  it("targets the named subaccount when bankAccountId given", () => {
    const s = makeSetters({
      checking: "0",
      cashAccounts: [
        { id: "a", kind: "checking", balance: "100" },
        { id: "b", kind: "checking", balance: "200" },
      ],
    });
    applySpendImpl("checking", 40, null, "b", s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.cashAccounts[0].balance).toBe("100");
    expect(s.accounts.cashAccounts[1].balance).toBe("160");
  });

  it("bumps the named credit debt's balance on credit spend with id", () => {
    const s = makeSetters({}, [{ id: 7, balance: "100" }, { id: 8, balance: "50" }]);
    applySpendImpl("credit", 25, 8, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.debts[0].balance).toBe("100");
    expect(s.debts[1].balance).toBe("75");
  });

  it("bails (no scalar mutation) when subaccounts exist but no id passed", () => {
    const s = makeSetters({
      checking: "100",
      cashAccounts: [{ id: "x", kind: "checking", balance: "50" }],
    });
    applySpendImpl("checking", 10, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.checking).toBe("100");
    expect(s.accounts.cashAccounts[0].balance).toBe("50");
  });
});

describe("applyRefundImpl", () => {
  it("increments scalar checking", () => {
    const s = makeSetters({ checking: "100" });
    applyRefundImpl("checking", 25, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.checking).toBe("125");
  });

  it("decrements scalar credit_card but clamps to zero", () => {
    const s = makeSetters({ credit_card: "10" });
    applyRefundImpl("credit", 50, null, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.credit_card).toBe("0");
  });

  it("decrements the named credit debt's balance but clamps at zero", () => {
    const s = makeSetters({}, [{ id: 1, balance: "30" }]);
    applyRefundImpl("credit", 100, 1, null, s.accounts, s.setAccounts, s.setDebts);
    expect(s.debts[0].balance).toBe("0");
  });

  it("targets the named subaccount", () => {
    const s = makeSetters({
      cashAccounts: [{ id: 1, kind: "savings", balance: "200" }],
    });
    applyRefundImpl("savings", 50, null, 1, s.accounts, s.setAccounts, s.setDebts);
    expect(s.accounts.cashAccounts[0].balance).toBe("250");
  });
});
