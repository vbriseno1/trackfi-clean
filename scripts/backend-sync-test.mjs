/**
 * Live Supabase backend integration test for the sync stack.
 * Run: node scripts/backend-sync-test.mjs
 * Requires .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Creates a throwaway user, exercises upload/pull/empty-cloud paths, then deletes all test rows.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(ROOT, ".env");
  const env = {};
  try {
    const text = readFileSync(path, "utf8");
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
  } catch (e) {
    throw new Error("Missing .env — copy .env.example and add Supabase credentials.");
  }
  return env;
}

const env = loadEnv();
const SUPA_URL = env.VITE_SUPABASE_URL || "";
const SUPA_KEY = env.VITE_SUPABASE_ANON_KEY || "";
const TEST_KEYS = ["accounts", "income", "expenses", "onboarded", "settings"];

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, err) {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, detail: msg });
  console.error(`  ✗ ${name} — ${msg}`);
  throw new Error(`Backend test failed: ${name}`);
}

async function supaFetch(path, { method = "GET", token, body, headers = {} } = {}) {
  const res = await fetch(SUPA_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPA_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.error_description || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function signInWithPassword(email, password) {
  const data = await supaFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    token: null,
    body: { email, password },
  });
  if (!data.access_token) {
    throw new Error("Sign-in did not return access_token");
  }
  return { email, password, session: data };
}

async function signUpTestUser() {
  const stamp = Date.now();
  const email = `trackfi-sync-${stamp}@example.com`;
  const password = `TfSync!${stamp}Aa1`;
  let data;
  try {
    data = await supaFetch("/auth/v1/signup", {
      method: "POST",
      token: null,
      body: { email, password },
    });
  } catch (e) {
    if (e.status === 429) {
      throw new Error(
        "Supabase signup rate-limited. Add TRACKFI_TEST_EMAIL and TRACKFI_TEST_PASSWORD to .env (dedicated test account) and re-run."
      );
    }
    throw e;
  }
  if (data.access_token) return { email, password, session: data };
  // Project may require email confirmation — try immediate password sign-in.
  try {
    return await signInWithPassword(email, password);
  } catch {
    throw new Error(
      "Signup succeeded but no session (email confirmation likely required). Set TRACKFI_TEST_EMAIL / TRACKFI_TEST_PASSWORD in .env."
    );
  }
}

async function obtainTestSession() {
  const email = env.TRACKFI_TEST_EMAIL.trim();
  const password = env.TRACKFI_TEST_PASSWORD.trim();
  return { ...(await signInWithPassword(email, password)), reused: true };
}

async function fetchUserData(uid, token) {
  return supaFetch(
    `/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}&select=key,value,updated_at`,
    { token }
  );
}

async function upsertRow(uid, token, key, value) {
  const updated_at = new Date().toISOString();
  return supaFetch("/rest/v1/user_data?on_conflict=user_id,key", {
    method: "POST",
    token,
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: { user_id: uid, key, value, updated_at },
  });
}

async function deleteAllUserData(uid, token) {
  await supaFetch(`/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}`, {
    method: "DELETE",
    token,
    headers: { Prefer: "return=minimal" },
  });
}

async function runVitestSyncSuite() {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const p = spawn("npm", ["test"], { cwd: ROOT, shell: true, stdio: "inherit" });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`vitest exit ${code}`))));
  });
}

function freshStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

/** Exercise real ss/flush + cloudHydration using the same modules as the app. */
async function runModuleSyncTest(uid, session) {
  process.env.VITE_SUPABASE_URL = SUPA_URL;
  process.env.VITE_SUPABASE_ANON_KEY = SUPA_KEY;
  const ls = freshStorage();
  globalThis.localStorage = ls;
  ls.setItem(
    "fv_session",
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token || "",
      token_type: "bearer",
      user: { id: uid },
    })
  );

  const { ss, flushPendingSync, supaFetchUserDataRows, getUploadSyncStatus } = await import(
    new URL("../src/lib/supabase.js", import.meta.url).href
  );
  const { applyCloudPullResult } = await import(
    new URL("../src/lib/cloudHydration.js", import.meta.url).href
  );

  const expenses = [{ id: "mod1", name: "Module path test", amount: "3", category: "Misc", date: "2026-05-20" }];
  await ss("fv6:expenses", expenses);
  const flush = await flushPendingSync();
  if (flush.error) fail("module flushPendingSync", new Error("upload error"));
  const st = getUploadSyncStatus();
  if (st.hasUploadProblem) fail("module upload status", new Error(st.failedKeys.join(",")));

  const pull = await supaFetchUserDataRows(uid);
  const rows = pull?.data || [];
  const row = rows.find((r) => r.key === "expenses");
  if (!row || JSON.stringify(row.value) !== JSON.stringify(expenses)) {
    fail("module pull expenses", new Error("value mismatch"));
  }
  pass("app modules ss → flush → pull");

  let hydrated = null;
  applyCloudPullResult({
    rows,
    uid,
    handlers: {
      setExpenses: (v) => {
        hydrated = v;
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
    },
    setDarkMode: () => {},
  });
  if (!hydrated?.find((e) => e.id === "mod1")) fail("module applyCloudPullResult", new Error("hydrate failed"));
  pass("app module applyCloudPullResult");
}

async function main() {
  console.log("\n══ Trackfi backend sync test ══\n");

  if (!SUPA_URL || !SUPA_KEY) fail("config", new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing"));

  console.log("1) Unit + integration tests (local)…");
  await runVitestSyncSuite();
  pass("vitest suite");

  console.log("\n2) Live Supabase API…");
  if (!env.TRACKFI_TEST_EMAIL?.trim() || !env.TRACKFI_TEST_PASSWORD?.trim()) {
    console.error(`
  Missing TRACKFI_TEST_EMAIL / TRACKFI_TEST_PASSWORD in .env

  Supabase is blocking new signups (rate limit). Use a dedicated test account:

    1. Supabase Dashboard → Authentication → Users → Add user
       (email + password, confirm email OFF if your project allows it)
    2. Add to .env:
         TRACKFI_TEST_EMAIL=that-user@example.com
         TRACKFI_TEST_PASSWORD=your-test-password
    3. Run: npm run test:backend

  The script only deletes user_data rows for that user — not the auth account.
`);
    process.exit(1);
  }
  let session;
  let uid;
  const cleanup = async () => {
    if (!uid || !session?.access_token) return;
    console.log("\n4) Cleanup test data…");
    try {
      await deleteAllUserData(uid, session.access_token);
      const left = await fetchUserData(uid, session.access_token);
      const rows = Array.isArray(left) ? left : left?.data ?? left;
      const count = Array.isArray(rows) ? rows.length : 0;
      if (count === 0) pass("delete user_data", "0 rows remain");
      else fail("delete user_data", new Error(`${count} rows still present`));
    } catch (e) {
      console.error("  ⚠ Cleanup error (manual delete may be needed):", e.message);
    }
  };

  try {
    const creds = await obtainTestSession();
    session = creds.session;
    pass(creds.reused ? "sign-in test user" : "signup test user", creds.email);

    const userRes = await supaFetch("/auth/v1/user", {
      token: session.access_token,
    });
    uid = userRes?.id || userRes?.user?.id;
    if (!uid) fail("resolve user id", new Error("no user id from /auth/v1/user"));
    pass("auth session", uid.slice(0, 8) + "…");

    // Empty cloud baseline
    let rows = await fetchUserData(uid, session.access_token);
    const initial = Array.isArray(rows) ? rows : [];
    if (initial.length === 0) pass("empty cloud baseline");
    else pass("empty cloud baseline", `${initial.length} pre-existing rows (will delete)`);

    // Upload slices (mirrors ss → flush)
    const payload = {
      accounts: {
        checking: "1200",
        savings: "800",
        cashAccounts: [{ id: "t1", name: "Test Checking", kind: "checking", balance: "1200" }],
      },
      income: { primary: "4500", payFrequency: "Biweekly" },
      expenses: [{ id: "be1", name: "Backend Test Coffee", amount: "4.50", category: "Misc", date: "2026-05-01" }],
      onboarded: true,
      settings: { darkMode: false, showHealth: true },
    };
    for (const key of TEST_KEYS) {
      await upsertRow(uid, session.access_token, key, payload[key]);
    }
    pass("upload test slices", TEST_KEYS.join(", "));

    // Pull (mirrors supaFetchUserDataRows + cloud hydration read)
    rows = await fetchUserData(uid, session.access_token);
    const pulled = Array.isArray(rows) ? rows : [];
    if (pulled.length < TEST_KEYS.length) {
      fail("pull user_data", new Error(`expected ≥${TEST_KEYS.length} rows, got ${pulled.length}`));
    }
    const map = {};
    for (const r of pulled) map[r.key] = r.value;
    if (parseFloat(map.accounts?.checking || 0) !== 1200) {
      fail("accounts roundtrip", new Error(`checking=${map.accounts?.checking}`));
    }
    if (!Array.isArray(map.expenses) || map.expenses.length !== 1) {
      fail("expenses roundtrip", new Error("expense count mismatch"));
    }
    if (map.onboarded !== true) fail("onboarded roundtrip", new Error("onboarded not true"));
    pass("pull + verify payload", `${pulled.length} rows`);

    // PATCH with version (optimistic concurrency smoke)
    const expRow = pulled.find((r) => r.key === "expenses");
    if (expRow?.updated_at) {
      const next = new Date().toISOString();
      const patched = await supaFetch(
        `/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}&key=eq.expenses&updated_at=eq.${encodeURIComponent(expRow.updated_at)}`,
        {
          method: "PATCH",
          token: session.access_token,
          headers: { Prefer: "return=representation" },
          body: {
            value: [...map.expenses, { id: "be2", name: "Second", amount: "2", category: "Misc", date: "2026-05-02" }],
            updated_at: next,
          },
        }
      );
      const patchRows = Array.isArray(patched) ? patched : [];
      if (patchRows.length === 1) pass("versioned PATCH");
      else fail("versioned PATCH", new Error(`rows returned: ${patchRows.length}`));
    } else {
      pass("versioned PATCH", "skipped (no updated_at on row)");
    }

    // Empty-cloud policy simulation: delete all, re-upload onboarded flag only locally would preserve — we only verify delete + re-upload
    await deleteAllUserData(uid, session.access_token);
    rows = await fetchUserData(uid, session.access_token);
    const afterDel = Array.isArray(rows) ? rows : [];
    if (afterDel.length !== 0) fail("mid-test wipe", new Error(`${afterDel.length} rows left`));
    pass("wipe user_data (empty cloud)");

    await upsertRow(uid, session.access_token, "onboarded", true);
    rows = await fetchUserData(uid, session.access_token);
    const final = Array.isArray(rows) ? rows : [];
    if (final.length === 1 && final[0].key === "onboarded") pass("re-upload after empty cloud");
    else fail("re-upload after empty cloud", new Error(`rows: ${final.map((r) => r.key).join(",")}`));

    console.log("\n3) App sync modules (ss / flush / cloudHydration)…");
    await runModuleSyncTest(uid, session);
  } finally {
    await cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n══ Summary ══");
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    process.exit(1);
  }
  console.log("All backend sync checks passed. Test user_data removed.");
  console.log(
    "Tip: set TRACKFI_TEST_EMAIL + TRACKFI_TEST_PASSWORD in .env for a stable test account.\n"
  );
}

main().catch((e) => {
  console.error("\n", e.message || e);
  process.exit(1);
});
