/**
 * Cloud snapshot → React state. One place handles the three sync paths:
 *   - boot (bootDefaults): merge local snapshot into defaults
 *   - background pull (cloudPull): authoritative — server wins for known keys
 *   - patch (no flags): merge incoming partial into current state
 *
 * `buildAuthoritativeCloudMap` ensures keys the server omitted are filled with empty/default
 * values so stale local rows can't survive next to newer partial Supabase data.
 */
import {
  DEF_ACCOUNTS,
  DEF_INCOME,
  DEF_SETTINGS,
  DEF_HOUSEHOLD,
  DEF_DASHCONFIG,
  DEF_CATS,
  DEF_CALCOLORS,
} from "./defaults.js";

export function applyUserDataSnapshot(map, H, { bootDefaults = false, cloudPull = false } = {}) {
  const setArr = (key, setter) => {
    if (map[key] === undefined) return;
    const v = map[key];
    if (v === null || v === undefined) return;
    if (!Array.isArray(v)) return;
    setter(v);
  };
  const apply = (key, setter, merge = false) => {
    if (map[key] === undefined) return;
    if (key === "nwGoal") {
      const nv = map[key];
      setter(nv === null || nv === undefined ? null : nv);
      return;
    }
    const v = map[key];
    if (v === null || v === undefined) return;
    if (merge) setter((prev) => ({ ...prev, ...v }));
    else setter(v);
  };
  try { setArr("expenses", H.setExpenses); } catch {}
  try { setArr("bills", H.setBills); } catch {}
  try { setArr("debts", H.setDebts); } catch {}
  try { setArr("bgoals", H.setBGoals); } catch {}
  try { setArr("sgoals", H.setSGoals); } catch {}
  try { setArr("cats", H.setCats); } catch {}
  try { setArr("trades", H.setTrades); } catch {}
  try { setArr("balHist", H.setBalHist); } catch {}
  try { setArr("shifts", H.setShifts); } catch {}
  try { setArr("recurrings", H.setRecurrings); } catch {}
  try { setArr("notifs", H.setNotifs); } catch {}
  try { setArr("settlements", H.setSettlements); } catch {}
  try { setArr("hhBudgets", H.setHhBudgets); } catch {}
  try { apply("nwGoal", H.setNwGoal); } catch {}
  try { setArr("subDismissed", H.setSubDismissed); } catch {}
  if (cloudPull) {
    try {
      if (map.accounts != null && typeof map.accounts === "object") {
        const a = map.accounts;
        H.setAccounts({ ...a, cashAccounts: Array.isArray(a.cashAccounts) ? a.cashAccounts.map((c) => ({ ...c })) : [] });
      }
    } catch {}
    try { if (map.income != null && typeof map.income === "object") H.setIncome({ ...map.income }); } catch {}
    try { if (map.settings != null && typeof map.settings === "object") H.setSettings({ ...DEF_SETTINGS, ...map.settings }); } catch {}
    try { if (map.calColors != null && typeof map.calColors === "object") H.setCalColors({ ...map.calColors }); } catch {}
    try { if (map.dashConfig != null && typeof map.dashConfig === "object") H.setDashConfig({ ...map.dashConfig }); } catch {}
    try {
      if (map.household != null && typeof map.household === "object") {
        const h = map.household;
        H.setHousehold({ ...h, members: Array.isArray(h.members) ? h.members.map((m) => ({ ...m })) : [] });
      }
    } catch {}
    try { if (map.accountRates != null && typeof map.accountRates === "object") H.setAccountRates({ ...map.accountRates }); } catch {}
  } else if (bootDefaults) {
    try { if (map.accounts != null && typeof map.accounts === "object") H.setAccounts((prev) => ({ ...DEF_ACCOUNTS, ...prev, ...map.accounts })); } catch {}
    try { if (map.income != null && typeof map.income === "object") H.setIncome((prev) => ({ ...DEF_INCOME, ...prev, ...map.income })); } catch {}
    try { apply("settings", H.setSettings, true); } catch {}
    try { apply("calColors", H.setCalColors, true); } catch {}
    try { apply("dashConfig", H.setDashConfig, true); } catch {}
    try { apply("household", H.setHousehold, true); } catch {}
  } else {
    try { apply("accounts", H.setAccounts, true); } catch {}
    try { apply("income", H.setIncome, true); } catch {}
    try { apply("settings", H.setSettings, true); } catch {}
    try { apply("calColors", H.setCalColors, true); } catch {}
    try { apply("dashConfig", H.setDashConfig, true); } catch {}
    try { apply("household", H.setHousehold, true); } catch {}
  }
  try { if (map.taccount !== undefined) H.setTradingAccount(map.taccount ?? { deposit: "", balance: "" }); } catch {}
  try { if (map.appName !== undefined) H.setAppName(map.appName || "Trackfi"); } catch {}
  try { if (map.greetName !== undefined) H.setGreetName(map.greetName || ""); } catch {}
  try { if (map.prof !== undefined) H.setProfCategory(map.prof); } catch {}
  try { if (map.profSub !== undefined) H.setProfSub(map.profSub); } catch {}
  try { if (map.merchantCats !== undefined) window._merchantCats = map.merchantCats || {}; } catch {}
  if (!cloudPull) {
    try { if (map.accountRates && typeof map.accountRates === "object") H.setAccountRates((prev) => ({ ...prev, ...map.accountRates })); } catch {}
  }
  try {
    if (map.onboarded === true) { localStorage.setItem("fv_onboarded", "1"); H.setOnboarded(true); }
    else if (map.onboarded === false) { localStorage.removeItem("fv_onboarded"); H.setOnboarded(false); }
  } catch {}
}

/**
 * Ensures every stored slice exists after a cloud read. Keys the server omits are treated as empty/default
 * so old local/demo rows cannot survive next to newer partial Supabase data.
 * `onboarded` is intentionally NOT filled — when the server has no value, local completion state is preserved.
 */
export function buildAuthoritativeCloudMap(raw) {
  const out = { ...raw };
  const defRates = { checking: 0, savings: 0, cushion: 0, k401: 0, roth_ira: 0, brokerage: 0, hsa: 0, crypto: 0 };
  const fill = (k, fn) => {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) out[k] = fn();
  };
  fill("expenses", () => []);
  fill("bills", () => []);
  fill("debts", () => []);
  fill("bgoals", () => []);
  fill("sgoals", () => []);
  fill("cats", () => DEF_CATS.map((c) => ({ ...c })));
  fill("trades", () => []);
  fill("balHist", () => []);
  fill("shifts", () => []);
  fill("recurrings", () => []);
  fill("notifs", () => []);
  fill("settlements", () => []);
  fill("hhBudgets", () => []);
  fill("subDismissed", () => []);
  fill("nwGoal", () => null);
  fill("accounts", () => ({ ...DEF_ACCOUNTS, cashAccounts: [...(DEF_ACCOUNTS.cashAccounts || [])] }));
  fill("income", () => ({ ...DEF_INCOME }));
  fill("taccount", () => ({ deposit: "", balance: "" }));
  fill("settings", () => ({ ...DEF_SETTINGS }));
  fill("calColors", () => DEF_CALCOLORS());
  fill("dashConfig", () => ({ ...DEF_DASHCONFIG }));
  fill("household", () => ({ ...DEF_HOUSEHOLD, members: DEF_HOUSEHOLD.members.map((m) => ({ ...m })) }));
  fill("merchantCats", () => ({}));
  fill("accountRates", () => ({ ...defRates }));
  fill("appName", () => "Trackfi");
  fill("greetName", () => "");
  fill("prof", () => "healthcare");
  fill("profSub", () => "nurse_rn");
  return out;
}
