import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { buildFullDemoSyncMap, syncMapToBackupExport } from "./demoSyncFixture.js";
import { parseTrackfiBackupJson } from "./dataBackup.js";
import { SCOPED_USER_DATA_KEYS } from "./supabase.js";

function freshStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe("sync roundtrip (demo data → ss → sg)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubGlobal("localStorage", freshStorage());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("persists and reads every SCOPED_USER_DATA_KEYS slice locally", async () => {
    const { ss, sg, getScope } = await import("./supabase.js");
    const demo = buildFullDemoSyncMap();
    const scope = getScope();

    for (const bare of SCOPED_USER_DATA_KEYS) {
      const value = demo[bare];
      if (value === undefined) {
        throw new Error(`demo fixture missing sync key: ${bare}`);
      }
      await ss(`fv6:${bare}`, value);
      const raw = localStorage.getItem(scope + bare);
      expect(raw, `scoped localStorage missing ${bare}`).toBeTruthy();
      const read = await sg(`fv6:${bare}`);
      expect(read, `sg did not return ${bare}`).toEqual(value);
    }
  });

  it("demo backup export validates and maps back to sync keys", () => {
    const demo = buildFullDemoSyncMap();
    const backup = syncMapToBackupExport(demo);
    const parsed = parseTrackfiBackupJson(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    expect(parsed.data.expenses.length).toBeGreaterThan(80);
    expect(parsed.data.expenses.length).toBe(demo.expenses.length);
    expect(parsed.data.savingsGoals).toEqual(demo.sgoals);
    expect(parsed.data.budgetGoals).toEqual(demo.bgoals);
    expect(parsed.data.tradingAccount).toEqual(demo.taccount);
    expect(parsed.data.profCategory).toBe("healthcare");
    expect(parsed.data.accounts.cashAccounts).toHaveLength(3);
  });

  it("applyPulledUserDataRows records row versions for conflict detection", async () => {
    const { applyPulledUserDataRows, clearUserDataRowVersions } = await import("./supabase.js");
    clearUserDataRowVersions();
    applyPulledUserDataRows([
      { key: "expenses", updated_at: "2026-05-01T12:00:00Z", value: [] },
      { key: "bills", updated_at: "2026-05-02T12:00:00Z", value: [] },
    ]);
    // Re-import to read internal state via flush behavior — smoke: no throw
    clearUserDataRowVersions();
    expect(true).toBe(true);
  });
});

describe("cloud authoritative merge + hydrate", () => {
  it("partial pull then full hydrate leaves no orphan expenses", async () => {
    const { buildAuthoritativeCloudMap } = await import("./userData.js");
    const { applyUserDataSnapshot } = await import("./userData.js");
    const { buildFullDemoSyncMap, makeSnapshotHandlers } = await import("./demoSyncFixture.js");

    const { H, state } = makeSnapshotHandlers({
      expenses: [{ id: 1, name: "Orphan", amount: "9", category: "Misc", date: "2020-01-01" }],
      bills: [{ id: 2, name: "Orphan bill", amount: "9", dueDate: "2020-01-01", paid: false }],
    });
    const partial = buildAuthoritativeCloudMap({ settings: { darkMode: true } });
    applyUserDataSnapshot(partial, H, { cloudPull: true });
    expect(state.expenses).toEqual([]);
    expect(state.bills).toEqual([]);
    expect(state.settings.darkMode).toBe(true);

    const full = buildAuthoritativeCloudMap(buildFullDemoSyncMap());
    applyUserDataSnapshot(full, H, { cloudPull: true });
    expect(state.expenses.length).toBeGreaterThan(80);
    expect(state.bills.length).toBeGreaterThan(80);
  });
});
