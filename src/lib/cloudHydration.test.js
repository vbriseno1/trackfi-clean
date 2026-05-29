import { describe, expect, it, beforeEach, vi } from "vitest";

function freshStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

describe("cloudHydration", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("localStorage", freshStorage());
    vi.resetModules();
  });

  it("rowsToRawMap maps REST rows", async () => {
    const { rowsToRawMap } = await import("./cloudHydration.js");
    expect(rowsToRawMap([{ key: "bills", value: [{ id: 1 }] }])).toEqual({
      bills: [{ id: 1 }],
    });
  });

  it("resolveEmptyCloudPullAction honors preserveLocalOnEmpty", async () => {
    const { resolveEmptyCloudPullAction, EMPTY_CLOUD_ACTION } = await import("./cloudHydration.js");
    expect(resolveEmptyCloudPullAction({ preserveLocalOnEmpty: true })).toBe(
      EMPTY_CLOUD_ACTION.HYDRATE_LOCAL
    );
  });

  it("applyCloudPullResult hydrates state from rows", async () => {
    const { applyCloudPullResult } = await import("./cloudHydration.js");
    const expenses = [{ id: "e1", amount: 10 }];
    let got = [];
    const handlers = {
      setExpenses: (v) => {
        got = v;
      },
      setBills: () => {},
      setDebts: () => {},
      setBGoals: () => {},
      setSGoals: () => {},
      setCats: () => {},
      setTrades: () => {},
      setBalHist: () => {},
      setShifts: () => {},
      setRecurrings: () => {},
      setNotifs: () => {},
      setSettlements: () => {},
      setHhBudgets: () => {},
      setNwGoal: () => {},
      setSubDismissed: () => {},
      setAccounts: () => {},
      setIncome: () => {},
      setSettings: () => {},
      setCalColors: () => {},
      setDashConfig: () => {},
      setHousehold: () => {},
      setTradingAccount: () => {},
      setAppName: () => {},
      setGreetName: () => {},
      setProfCategory: () => {},
      setProfSub: () => {},
      setAccountRates: () => {},
      setOnboarded: () => {},
    };
    const { hadRows, fullMap } = applyCloudPullResult({
      rows: [{ key: "expenses", value: expenses, updated_at: "2026-01-01T00:00:00Z" }],
      uid: "user-uuid-12345678",
      handlers,
      setDarkMode: () => {},
    });
    expect(hadRows).toBe(true);
    expect(got).toEqual(expenses);
    expect(fullMap.expenses).toEqual(expenses);
  });
});
