/**
 * Live Supabase sync tests — OFF by default.
 * Run: TRACKFI_LIVE_BACKEND=1 npm test -- src/lib/backend.live.test.js
 * Requires .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Optional: TRACKFI_TEST_EMAIL, TRACKFI_TEST_PASSWORD (recommended; avoids signup rate limits)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const LIVE = process.env.TRACKFI_LIVE_BACKEND === "1";
const describeLive = LIVE ? describe : describe.skip;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function loadEnvFile() {
  const env = {};
  try {
    const text = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {
    return null;
  }
  return env;
}

function freshStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

describeLive("live backend sync", () => {
  let uid;
  let token;
  let env;
  let createdUser = false;

  beforeAll(async () => {
    env = loadEnvFile();
    if (!env?.VITE_SUPABASE_URL || !env?.VITE_SUPABASE_ANON_KEY) {
      throw new Error("Missing VITE_SUPABASE_* in .env");
    }
    vi.stubEnv("VITE_SUPABASE_URL", env.VITE_SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", env.VITE_SUPABASE_ANON_KEY);
    vi.stubGlobal("localStorage", freshStorage());

    const base = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_ANON_KEY;

    async function authFetch(path, body) {
      const res = await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error_description || `HTTP ${res.status}`);
      return data;
    }

    if (env.TRACKFI_TEST_EMAIL && env.TRACKFI_TEST_PASSWORD) {
      const data = await authFetch("/auth/v1/token?grant_type=password", {
        email: env.TRACKFI_TEST_EMAIL,
        password: env.TRACKFI_TEST_PASSWORD,
      });
      token = data.access_token;
      uid = data.user?.id;
    } else {
      const stamp = Date.now();
      const email = `trackfi-live-${stamp}@example.com`;
      const password = `TfLive!${stamp}Aa1`;
      let data = await authFetch("/auth/v1/signup", { email, password });
      createdUser = true;
      if (!data.access_token) {
        data = await authFetch("/auth/v1/token?grant_type=password", { email, password });
      }
      token = data.access_token;
      uid = data.user?.id || data.id;
    }
    if (!token || !uid) throw new Error("Could not obtain test session");

    localStorage.setItem(
      "fv_session",
      JSON.stringify({
        access_token: token,
        refresh_token: "",
        token_type: "bearer",
        user: { id: uid, email: env.TRACKFI_TEST_EMAIL || "live-test" },
      })
    );
  }, 60000);

  afterAll(async () => {
    if (!uid || !token || !env) return;
    await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}`,
      {
        method: "DELETE",
        headers: {
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: "return=minimal",
        },
      }
    );
  }, 30000);

  it("ss + flushPendingSync uploads expenses to user_data", async () => {
    vi.resetModules();
    const { markCloudHydrationConfirmed } = await import("./syncLifecycle.js");
    const { ss, flushPendingSync, supaFetchUserDataRows } = await import("./supabase.js");
    // Uploads are gated until the session has confirmed the cloud state.
    markCloudHydrationConfirmed();
    const sample = [{ id: "live1", name: "Live test", amount: "9.99", category: "Misc", date: "2026-05-15" }];
    await ss("fv6:expenses", sample);
    const out = await flushPendingSync();
    expect(out.error).toBe(false);

    const res = await supaFetchUserDataRows(uid);
    expect(res.error).toBeNull();
    const row = res.data?.find((r) => r.key === "expenses");
    expect(row?.value).toEqual(sample);
  }, 30000);

  it("applyCloudPullResult round-trips through hydration module", async () => {
    vi.resetModules();
    const { supaFetchUserDataRows } = await import("./supabase.js");
    const { applyCloudPullResult } = await import("./cloudHydration.js");

    let got = null;
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

    const res = await supaFetchUserDataRows(uid);
    const { hadRows } = applyCloudPullResult({
      rows: res.data || [],
      uid,
      handlers,
      setDarkMode: () => {},
    });
    expect(hadRows).toBe(true);
    expect(Array.isArray(got)).toBe(true);
    expect(got.some((e) => e.id === "live1")).toBe(true);
  }, 30000);

  it("resolveEmptyCloudPullAction preserves when fv_onboarded set", async () => {
    localStorage.setItem("fv_onboarded", "1");
    const { resolveEmptyCloudPullAction, EMPTY_CLOUD_ACTION } = await import("./cloudHydration.js");
    expect(resolveEmptyCloudPullAction()).toBe(EMPTY_CLOUD_ACTION.HYDRATE_LOCAL);
  });
});
