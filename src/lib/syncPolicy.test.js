import { describe, expect, it, beforeEach, vi } from "vitest";

function freshStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

describe("syncPolicy", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "k");
    vi.stubGlobal("localStorage", freshStorage());
    vi.resetModules();
  });

  it("resolveEmptyCloudAction preserves when fv_onboarded is set", async () => {
    localStorage.setItem("fv_onboarded", "1");
    const { resolveEmptyCloudAction, EMPTY_CLOUD_ACTION } = await import("./syncPolicy.js");
    expect(resolveEmptyCloudAction()).toBe(EMPTY_CLOUD_ACTION.HYDRATE_LOCAL);
  });

  it("resolveEmptyCloudAction wipes only for truly empty device", async () => {
    const { resolveEmptyCloudAction, EMPTY_CLOUD_ACTION } = await import("./syncPolicy.js");
    expect(resolveEmptyCloudAction()).toBe(EMPTY_CLOUD_ACTION.WIPE_TO_DEFAULTS);
  });

  it("shouldMarkOnboardedFromSnapshot when cloud has expenses but no onboarded key", async () => {
    const { shouldMarkOnboardedFromSnapshot } = await import("./syncPolicy.js");
    expect(shouldMarkOnboardedFromSnapshot({ expenses: [{ id: 1 }] })).toBe(true);
    expect(shouldMarkOnboardedFromSnapshot({ accounts: { checking: "100" } })).toBe(true);
    expect(shouldMarkOnboardedFromSnapshot({})).toBe(false);
  });

  it("applyOnboardingFlagsFromSnapshot sets localStorage flag", async () => {
    const { applyOnboardingFlagsFromSnapshot } = await import("./syncPolicy.js");
    let onboarded = false;
    applyOnboardingFlagsFromSnapshot({ income: { primary: "2000" } }, (v) => {
      onboarded = v;
    });
    expect(onboarded).toBe(true);
    expect(localStorage.getItem("fv_onboarded")).toBe("1");
  });
});
