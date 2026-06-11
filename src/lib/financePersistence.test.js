import { describe, expect, it, beforeEach } from "vitest";
import { setSyncPhase, SYNC_PHASE, resetSyncLifecycle, markCloudHydrationConfirmed } from "./syncLifecycle.js";
import { shouldPersistFinanceSlice, shouldPersistConfigSlice, isDefaultSliceValue } from "./financePersistence.js";
import { DEF_INCOME, DEF_SETTINGS, DEF_HOUSEHOLD, DEF_CATS, DEF_CALCOLORS, DEF_DASHCONFIG } from "./defaults.js";

describe("financePersistence", () => {
  beforeEach(() => {
    resetSyncLifecycle();
  });

  it("blocks empty collections for signed-in user during boot", () => {
    expect(
      shouldPersistFinanceSlice({
        ready: true,
        signedIn: true,
        hasContent: false,
      })
    ).toBe(false);
  });

  it("allows persist when sync is ready", () => {
    setSyncPhase(SYNC_PHASE.READY);
    expect(
      shouldPersistFinanceSlice({
        ready: true,
        signedIn: true,
        hasContent: false,
      })
    ).toBe(true);
  });

  it("always persists for offline users", () => {
    expect(
      shouldPersistFinanceSlice({
        ready: true,
        signedIn: false,
        hasContent: false,
      })
    ).toBe(true);
  });
});

describe("isDefaultSliceValue", () => {
  it("recognizes DEF_* constants regardless of key order", () => {
    expect(isDefaultSliceValue("income", { ...DEF_INCOME })).toBe(true);
    const reordered = Object.fromEntries(Object.entries(DEF_SETTINGS).reverse());
    expect(isDefaultSliceValue("settings", reordered)).toBe(true);
    expect(isDefaultSliceValue("household", { ...DEF_HOUSEHOLD, members: DEF_HOUSEHOLD.members.map((m) => ({ ...m })) })).toBe(true);
    expect(isDefaultSliceValue("dashConfig", { ...DEF_DASHCONFIG })).toBe(true);
    expect(isDefaultSliceValue("cats", DEF_CATS.map((c) => ({ ...c })))).toBe(true);
    expect(isDefaultSliceValue("calColors", DEF_CALCOLORS())).toBe(true);
    expect(isDefaultSliceValue("taccount", { balance: "", deposit: "" })).toBe(true);
    expect(isDefaultSliceValue("bgoals", [])).toBe(true);
    expect(isDefaultSliceValue("sgoals", [])).toBe(true);
    expect(isDefaultSliceValue("prof", "healthcare")).toBe(true);
    expect(isDefaultSliceValue("profSub", "nurse_rn")).toBe(true);
    expect(isDefaultSliceValue("appName", "Trackfi")).toBe(true);
    expect(isDefaultSliceValue("greetName", "")).toBe(true);
  });

  it("recognizes user data as non-default", () => {
    expect(isDefaultSliceValue("income", { ...DEF_INCOME, primary: "4200" })).toBe(false);
    expect(isDefaultSliceValue("settings", { ...DEF_SETTINGS, darkMode: true })).toBe(false);
    expect(isDefaultSliceValue("bgoals", [{ id: 1, category: "Food", limit: "400" }])).toBe(false);
    expect(isDefaultSliceValue("greetName", "Victor")).toBe(false);
    expect(isDefaultSliceValue("cats", [...DEF_CATS, { id: "x", name: "Custom", icon: "✨" }])).toBe(false);
  });

  it("treats unknown slices as default (never uploadable)", () => {
    expect(isDefaultSliceValue("someFutureSlice", { real: "data" })).toBe(true);
  });
});

describe("shouldPersistConfigSlice", () => {
  beforeEach(() => {
    resetSyncLifecycle();
  });

  it("blocks everything before ready", () => {
    expect(
      shouldPersistConfigSlice({ ready: false, signedIn: true, slice: "income", value: { ...DEF_INCOME, primary: "9" } })
    ).toBe(false);
  });

  it("always persists for signed-out users", () => {
    expect(
      shouldPersistConfigSlice({ ready: true, signedIn: false, slice: "income", value: { ...DEF_INCOME } })
    ).toBe(true);
  });

  it("blocks default values for signed-in users until hydration is confirmed", () => {
    setSyncPhase(SYNC_PHASE.READY);
    // READY without confirmation = degraded boot (fetch failed) — defaults must not persist.
    expect(
      shouldPersistConfigSlice({ ready: true, signedIn: true, slice: "settings", value: { ...DEF_SETTINGS } })
    ).toBe(false);
    expect(
      shouldPersistConfigSlice({ ready: true, signedIn: true, slice: "bgoals", value: [] })
    ).toBe(false);
  });

  it("allows non-default values for signed-in users even before confirmation", () => {
    setSyncPhase(SYNC_PHASE.READY);
    expect(
      shouldPersistConfigSlice({ ready: true, signedIn: true, slice: "income", value: { ...DEF_INCOME, primary: "4200" } })
    ).toBe(true);
  });

  it("allows all values once hydration is confirmed and sync is ready", () => {
    markCloudHydrationConfirmed();
    setSyncPhase(SYNC_PHASE.READY);
    expect(
      shouldPersistConfigSlice({ ready: true, signedIn: true, slice: "settings", value: { ...DEF_SETTINGS } })
    ).toBe(true);
  });
});
