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

  it("fresh sign-in: hydration write-back uploads nothing to the cloud", async () => {
    // Simulates the "brand new device" criterion at module level: pull rows, then the
    // persistence effects re-save the exact hydrated values — zero cloud writes allowed.
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubGlobal("localStorage", freshStorage());
    localStorage.setItem(
      "fv_session",
      JSON.stringify({ user: { id: "user-uuid-12345678" }, access_token: "tok" })
    );
    vi.useFakeTimers();
    vi.resetModules();
    const { markCloudHydrationConfirmed } = await import("./syncLifecycle.js");
    const { applyCloudPullResult } = await import("./cloudHydration.js");
    const { ss } = await import("./supabase.js");
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    const state = {};
    const noop = () => {};
    const handlers = new Proxy({}, { get: (_, name) => (name.startsWith("set") ? (v) => { state[name] = v; } : noop) });
    const bills = [{ id: 1, name: "Rent", amount: "1200", dueDate: "2026-07-01", paid: false }];
    const { fullMap } = applyCloudPullResult({
      rows: [{ key: "bills", value: bills, updated_at: "2026-01-01T00:00:00Z" }],
      uid: "user-uuid-12345678",
      handlers,
      setDarkMode: () => {},
    });
    markCloudHydrationConfirmed();

    // Persistence effects fire with the hydrated values (same refs / filled defaults).
    await ss("fv6:bills", state.setBills);
    await ss("fv6:expenses", fullMap.expenses);
    await ss("fv6:nwGoal", fullMap.nwGoal);
    await ss("fv6:settings", { ...(await import("./defaults.js")).DEF_SETTINGS, ...fullMap.settings });
    await vi.runAllTimersAsync();
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // A genuine user edit still uploads.
    await ss("fv6:bills", [...bills, { id: 2, name: "Power", amount: "80", dueDate: "2026-07-05", paid: false }]);
    await vi.runAllTimersAsync();
    expect(globalThis.fetch).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("degraded boot (fetch failed): default state never uploads", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubGlobal("localStorage", freshStorage());
    localStorage.setItem(
      "fv_session",
      JSON.stringify({ user: { id: "user-uuid-12345678" }, access_token: "tok" })
    );
    vi.resetModules();
    const { setSyncPhase, SYNC_PHASE } = await import("./syncLifecycle.js");
    const { ss, flushPendingSync, supaFetchUserDataRowsWithRetry } = await import("./supabase.js");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network down"));

    const bulk = await supaFetchUserDataRowsWithRetry("user-uuid-12345678", {
      attempts: 2,
      perTryTimeoutMs: 20,
      backoffMs: 1,
      deadlineMs: 1000,
    });
    expect(bulk.ok).toBe(false);
    // App reaches READY in degraded mode — hydration unconfirmed.
    setSyncPhase(SYNC_PHASE.READY);

    vi.useFakeTimers();
    globalThis.fetch.mockClear();
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await ss("fv6:bills", []);
    await ss("fv6:income", { primary: "", other: "" });
    await vi.runAllTimersAsync();
    const out = await flushPendingSync();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(out.error).toBe(false);
    vi.useRealTimers();
  });

  it("delayed Supabase response: bulk fetch stays pending and nothing uploads during the wait", async () => {
    // Criterion 1: while the boot fetch is in flight (e.g. 30s delay), hydration is never
    // confirmed, so any ss() during the wait must not schedule or send a cloud upload.
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubGlobal("localStorage", freshStorage());
    localStorage.setItem(
      "fv_session",
      JSON.stringify({ user: { id: "user-uuid-12345678" }, access_token: "tok" })
    );
    vi.useFakeTimers();
    vi.resetModules();
    const { isCloudHydrationConfirmed } = await import("./syncLifecycle.js");
    const { ss, flushPendingSync, getUploadSyncStatus, supaFetchUserDataRowsWithRetry } = await import("./supabase.js");

    // Supabase responds only after 30s — model an in-flight boot fetch.
    let resolveFetch;
    const uploadCalls = [];
    globalThis.fetch = vi.fn((url, init) => {
      if ((init?.method || "GET") !== "GET") uploadCalls.push(url);
      return new Promise((res) => {
        resolveFetch = () => res({ ok: true, json: async () => [] });
      });
    });

    let settled = false;
    const bootPromise = supaFetchUserDataRowsWithRetry("user-uuid-12345678", {
      attempts: 3,
      perTryTimeoutMs: 60000,
      backoffMs: 1500,
      deadlineMs: 45000,
    }).then((r) => {
      settled = true;
      return r;
    });

    // Advance 30s of "waiting" — the fetch has not resolved, so the boot helper is pending.
    await vi.advanceTimersByTimeAsync(30000);
    expect(settled).toBe(false);
    expect(isCloudHydrationConfirmed()).toBe(false);

    // User-driven edits during the wait: zero uploads scheduled or sent.
    await ss("fv6:bills", [{ id: 1, name: "Rent", amount: "1200" }]);
    await ss("fv6:income", { primary: "5000" });
    expect(getUploadSyncStatus().pendingCount).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    const flush = await flushPendingSync();
    expect(uploadCalls).toEqual([]);
    expect(flush.error).toBe(false);

    // Let the boot fetch finally resolve to a confirmed-empty cloud and clean up timers.
    resolveFetch();
    await bootPromise;
    expect(settled).toBe(true);
    vi.useRealTimers();
  });
});
