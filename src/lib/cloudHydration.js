/**
 * Unified cloud + local hydration — single code path for boot bulk fetch and loadFromSupabase.
 */
import {
  applyPulledUserDataRows,
  recordCloudEchoValues,
  cancelPendingDebouncedSync,
  SCOPED_USER_DATA_KEYS,
  sg,
  getScope,
} from "./supabase.js";
import { applyUserDataSnapshot, buildAuthoritativeCloudMap } from "./userData.js";
import { DEF_SETTINGS } from "./defaults.js";
import {
  resolveEmptyCloudAction,
  EMPTY_CLOUD_ACTION,
  applyOnboardingFlagsFromSnapshot,
  shouldMarkOnboardedFromSnapshot,
} from "./syncPolicy.js";

export { EMPTY_CLOUD_ACTION };

/** Keys loaded per-field during boot local fallback (subset used before; kept for stable ordering). */
export const BOOT_LOCAL_KEYS = [
  "accounts",
  "income",
  "expenses",
  "bills",
  "debts",
  "bgoals",
  "sgoals",
  "cats",
  "trades",
  "taccount",
  "settings",
  "calColors",
  "notifs",
  "balHist",
  "shifts",
  "prof",
  "profSub",
  "dashConfig",
  "appName",
  "greetName",
  "merchantCats",
  "recurrings",
  "settlements",
  "hhBudgets",
  "nwGoal",
  "subDismissed",
];

export function rowsToRawMap(rows) {
  const map = {};
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (row?.key != null) map[row.key] = row.value;
  }
  return map;
}

export function mirrorCloudMapToScope(uid, fullMap) {
  if (!uid || !fullMap) return;
  const scope = `fv6_${uid.slice(0, 8)}:`;
  for (const key of SCOPED_USER_DATA_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(fullMap, key)) continue;
    try {
      localStorage.setItem(scope + key, JSON.stringify(fullMap[key]));
    } catch {}
  }
}

export function readScopeBulkMap(scope, keys = SCOPED_USER_DATA_KEYS) {
  const bulk = {};
  for (const bare of keys) {
    try {
      const raw = localStorage.getItem(scope + bare);
      if (raw !== null) bulk[bare] = JSON.parse(raw);
    } catch {}
  }
  return bulk;
}

export function applyDarkModeFromSettings(fullMap, setDarkMode) {
  const pulledSettings = fullMap?.settings;
  if (
    pulledSettings &&
    typeof pulledSettings === "object" &&
    Object.prototype.hasOwnProperty.call(pulledSettings, "darkMode") &&
    typeof pulledSettings.darkMode === "boolean"
  ) {
    setDarkMode(pulledSettings.darkMode);
  }
}

/**
 * Apply authoritative Supabase rows to React state + scoped localStorage.
 * @returns {{ fullMap: object, hadRows: boolean }}
 */
export function applyCloudPullResult({ rows, uid, handlers, setDarkMode }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { fullMap: null, hadRows: false };
  }
  cancelPendingDebouncedSync();
  applyPulledUserDataRows(rows);
  const raw = rowsToRawMap(rows);
  const fullMap = buildAuthoritativeCloudMap(raw);
  // Hydration must never write back to the cloud: remember what the cloud now holds
  // (rows + filled defaults) so the persistence effects' echo writes skip upload.
  // Settings are recorded post-merge to match what React state will re-serialize.
  recordCloudEchoValues({
    ...fullMap,
    ...(fullMap.settings && typeof fullMap.settings === "object"
      ? { settings: { ...DEF_SETTINGS, ...fullMap.settings } }
      : {}),
  });
  applyUserDataSnapshot(fullMap, handlers, { cloudPull: true });
  applyDarkModeFromSettings(fullMap, setDarkMode);
  applyOnboardingFlagsFromSnapshot(fullMap, handlers.setOnboarded);
  if (uid) mirrorCloudMapToScope(uid, fullMap);
  return { fullMap, hadRows: true };
}

/** Empty cloud pull/boot: hydrate_local vs wipe_to_defaults. */
export function resolveEmptyCloudPullAction({ preserveLocalOnEmpty = false } = {}) {
  if (preserveLocalOnEmpty) return EMPTY_CLOUD_ACTION.HYDRATE_LOCAL;
  return resolveEmptyCloudAction();
}

/**
 * Build boot map from scoped storage (demo bulk map, device scope, or post-empty-cloud).
 */
export async function buildBootMapFromLocal({ uid, bulkMap = {}, sgFn = sg }) {
  async function readBare(bare) {
    if (bulkMap[bare] !== undefined) return bulkMap[bare];
    return sgFn(`fv6:${bare}`);
  }

  const bootMap = {};
  const vals = await Promise.all(BOOT_LOCAL_KEYS.map((bare) => readBare(bare)));
  BOOT_LOCAL_KEYS.forEach((k, i) => {
    const v = vals[i];
    if (uid && bulkMap[k] !== undefined) bootMap[k] = bulkMap[k];
    else if (v !== undefined && v !== null) bootMap[k] = v;
  });

  try {
    const hh = bulkMap.household !== undefined ? bulkMap.household : await readBare("household");
    if (hh != null && typeof hh === "object") bootMap.household = hh;
  } catch {}

  try {
    const ar = bulkMap.accountRates !== undefined ? bulkMap.accountRates : await readBare("accountRates");
    if (ar && typeof ar === "object") bootMap.accountRates = ar;
  } catch {}

  try {
    if (shouldMarkOnboardedFromSnapshot(bootMap)) bootMap.onboarded = true;
    else {
      const ob = bulkMap.onboarded !== undefined ? bulkMap.onboarded : await readBare("onboarded");
      if (ob) bootMap.onboarded = ob;
    }
  } catch {}

  return bootMap;
}

/** Apply local/demo boot snapshot (bootDefaults merge). */
export function applyLocalBootSnapshot({ bootMap, handlers, setDarkMode }) {
  applyUserDataSnapshot(bootMap, handlers, { bootDefaults: true });
  applyOnboardingFlagsFromSnapshot(bootMap, handlers.setOnboarded);
  applyDarkModeFromSettings(bootMap, setDarkMode);
}

/** Re-hydrate React from scoped storage after empty cloud pull (migration / upload pending). */
export async function hydrateReactFromScopedLocal({ handlers, setDarkMode, uid }) {
  const scope = uid ? `fv6_${uid.slice(0, 8)}:` : getScope();
  const bulkMap = readScopeBulkMap(scope);
  const bootMap = await buildBootMapFromLocal({ uid, bulkMap });
  applyLocalBootSnapshot({ bootMap, handlers, setDarkMode });
  return bootMap;
}
