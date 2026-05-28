import { describe, expect, it, beforeEach, vi } from "vitest";
import { applyUserDataSnapshot, buildAuthoritativeCloudMap } from "./userData.js";
import { DEF_SETTINGS, DEF_ACCOUNTS, DEF_CATS } from "./defaults.js";
import { buildFullDemoSyncMap, makeSnapshotHandlers } from "./demoSyncFixture.js";
import { liquidFieldDisplay } from "./cashAccounts.js";

describe("buildAuthoritativeCloudMap", () => {
  it("fills every sync slice when server returns only expenses", () => {
    const raw = { expenses: [{ id: 1, name: "Coffee", amount: "5", category: "Coffee", date: "2026-01-01" }] };
    const map = buildAuthoritativeCloudMap(raw);
    expect(map.expenses).toHaveLength(1);
    expect(map.bills).toEqual([]);
    expect(map.debts).toEqual([]);
    expect(map.sgoals).toEqual([]);
    expect(map.bgoals).toEqual([]);
    expect(map.cats).toHaveLength(DEF_CATS.length);
    expect(map.accounts.cashAccounts).toEqual([]);
    expect(map.income.payFrequency).toBe("Biweekly");
    expect(map.settings.defaultExpensePaidFrom).toBe("checking");
    expect(Object.prototype.hasOwnProperty.call(map, "onboarded")).toBe(false);
  });

  it("preserves server-provided slices without overwriting", () => {
    const demo = buildFullDemoSyncMap();
    const map = buildAuthoritativeCloudMap({ expenses: demo.expenses, bills: demo.bills });
    expect(map.expenses.length).toBeGreaterThan(50);
    expect(map.bills.length).toBeGreaterThan(50);
    expect(map.debts).toEqual([]);
  });
});

describe("applyUserDataSnapshot cloudPull", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      _m: new Map(),
      getItem: (k) => localStorage._m.get(k) ?? null,
      setItem: (k, v) => void localStorage._m.set(k, String(v)),
      removeItem: (k) => void localStorage._m.delete(k),
    });
    vi.stubGlobal("window", { _merchantCats: {} });
  });

  it("hydrates all demo sections from full cloud map", () => {
    const demo = buildFullDemoSyncMap();
    const auth = buildAuthoritativeCloudMap(demo);
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot(auth, H, { cloudPull: true });

    expect(state.expenses.length).toBeGreaterThan(80);
    expect(state.bills.length).toBeGreaterThan(100);
    expect(state.debts).toHaveLength(4);
    expect(state.savingsGoals).toHaveLength(5);
    expect(state.budgetGoals).toHaveLength(8);
    expect(state.trades.length).toBeGreaterThan(50);
    expect(state.shifts.length).toBeGreaterThan(40);
    expect(state.recurrings).toHaveLength(5);
    expect(state.settlements).toHaveLength(2);
    expect(state.hhBudgets).toHaveLength(2);
    expect(state.nwGoal).toEqual({ target: 150000 });
    expect(state.accounts.cashAccounts).toHaveLength(3);
    expect(state.income.primary).toBe("4200");
    expect(state.income.lastPayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(state.household.enabled).toBe(true);
    expect(state.household.members).toHaveLength(2);
    expect(state.settings.defaultCheckingAccountId).toBeTruthy();
    expect(state.tradingAccount.balance).toBe("5600");
    expect(state.greetName).toBe("Victor");
    expect(state.profCategory).toBe("healthcare");
    expect(state.accountRates.savings).toBeGreaterThan(4);
    expect(window._merchantCats.publix).toBe("Groceries");
  });

  it("clears stale local bills when server omits bills key then cloudPull fills empty", () => {
    const { H, state } = makeSnapshotHandlers({
      bills: [{ id: 999, name: "Stale", amount: "50", dueDate: "2026-01-01", paid: false }],
    });
    const auth = buildAuthoritativeCloudMap({ expenses: [] });
    applyUserDataSnapshot(auth, H, { cloudPull: true });
    expect(state.bills).toEqual([]);
    expect(state.expenses).toEqual([]);
  });

  it("deep-copies cashAccounts and household members on cloudPull", () => {
    const demo = buildFullDemoSyncMap();
    const auth = buildAuthoritativeCloudMap(demo);
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot(auth, H, { cloudPull: true });
    state.accounts.cashAccounts[0].balance = "0";
    state.household.members[0].name = "Changed";
    applyUserDataSnapshot(auth, H, { cloudPull: true });
    expect(state.accounts.cashAccounts[0].balance).not.toBe("0");
    expect(state.household.members[0].name).toBe("Victor");
  });

  it("merges settings with DEF_SETTINGS on cloudPull", () => {
    const demo = buildFullDemoSyncMap();
    const partial = buildAuthoritativeCloudMap({
      ...demo,
      settings: { darkMode: true },
    });
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot(partial, H, { cloudPull: true });
    expect(state.settings.darkMode).toBe(true);
    expect(state.settings.showHealth).toBe(true);
    expect(state.settings.defaultExpensePaidFrom).toBe("checking");
  });

  it("mirrors checking/savings legacy fields when cloud accounts use cashAccounts only", () => {
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot(
      {
        accounts: {
          checking: "",
          savings: "",
          cushion: "500",
          cashAccounts: [
            { id: 1, kind: "checking", balance: "2000" },
            { id: 2, kind: "savings", balance: "8000" },
          ],
        },
      },
      H,
      { cloudPull: true }
    );
    expect(state.accounts.checking).toBe("2000");
    expect(state.accounts.savings).toBe("8000");
    expect(liquidFieldDisplay(state.accounts, "checking")).toBe("2000");
  });

  it("sets onboarded from cloud and localStorage flag", () => {
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot({ onboarded: true }, H, { cloudPull: true });
    expect(state.onboarded).toBe(true);
    expect(localStorage.getItem("fv_onboarded")).toBe("1");
  });
});

describe("applyUserDataSnapshot bootDefaults", () => {
  it("mirrors liquid totals when boot merges cashAccounts patch", () => {
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot(
      {
        accounts: {
          cashAccounts: [{ id: 9, kind: "checking", name: "Main", balance: "1500" }],
        },
      },
      H,
      { bootDefaults: true }
    );
    expect(state.accounts.checking).toBe("1500");
  });

  it("merges demo income into defaults without dropping payFrequency", () => {
    const { H, state } = makeSnapshotHandlers();
    applyUserDataSnapshot({ income: { primary: "4200", lastPayDate: "2026-05-01" } }, H, { bootDefaults: true });
    expect(state.income.primary).toBe("4200");
    expect(state.income.payFrequency).toBe("Biweekly");
    expect(state.income.lastPayDate).toBe("2026-05-01");
  });
});

describe("applyUserDataSnapshot patch", () => {
  it("shallow-merges accounts without replacing cashAccounts array reference when omitted", () => {
    const { H, state } = makeSnapshotHandlers({
      accounts: { ...DEF_ACCOUNTS, cushion: "500", cashAccounts: [{ id: 1, name: "X", kind: "checking", balance: "100" }] },
    });
    applyUserDataSnapshot({ accounts: { cushion: "900" } }, H);
    expect(state.accounts.cushion).toBe("900");
    expect(state.accounts.cashAccounts).toHaveLength(1);
  });
});
