import { isSyncReady, isCloudHydrationConfirmed } from "./syncLifecycle.js";
import {
  DEF_INCOME,
  DEF_SETTINGS,
  DEF_HOUSEHOLD,
  DEF_DASHCONFIG,
  DEF_CATS,
  DEF_CALCOLORS,
} from "./defaults.js";

/**
 * Whether a finance slice should be written via ss() on this render.
 * Signed-in users: during boot/pull, skip persisting empty collections so defaults
 * do not overwrite cloud data before hydration completes.
 */
export function shouldPersistFinanceSlice({
  ready,
  signedIn,
  hasContent,
  slice = "collection",
  accountsHasBalance = false,
}) {
  if (!ready) return false;
  if (!signedIn) return true;
  if (isSyncReady()) return true;
  if (slice === "nwGoal") return false;
  if (slice === "accounts") return accountsHasBalance;
  return hasContent;
}

/** JSON stringify with recursively sorted object keys so default comparison ignores key order. */
function sortedJson(v) {
  if (Array.isArray(v)) return "[" + v.map(sortedJson).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + sortedJson(v[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(v) ?? "undefined";
}

const DEF_ACCOUNT_RATES = { checking: 0, savings: 0, cushion: 0, k401: 0, roth_ira: 0, brokerage: 0, hsa: 0, crypto: 0 };
const DEF_TACCOUNT = { deposit: "", balance: "" };

/**
 * True when a config slice's value is indistinguishable from its first-run default —
 * i.e. it carries no user data and must never be uploaded over real cloud rows.
 */
export function isDefaultSliceValue(slice, value) {
  try {
    switch (slice) {
      case "income":
        return value == null || sortedJson(value) === sortedJson(DEF_INCOME);
      case "settings":
        return value == null || sortedJson(value) === sortedJson(DEF_SETTINGS);
      case "household":
        return value == null || sortedJson(value) === sortedJson(DEF_HOUSEHOLD);
      case "dashConfig":
        return value == null || sortedJson(value) === sortedJson(DEF_DASHCONFIG);
      case "cats":
        return value == null || sortedJson(value) === sortedJson(DEF_CATS);
      case "calColors":
        return value == null || sortedJson(value) === sortedJson(DEF_CALCOLORS());
      case "taccount":
        return value == null || sortedJson(value) === sortedJson(DEF_TACCOUNT);
      case "accountRates":
        return value == null || sortedJson(value) === sortedJson(DEF_ACCOUNT_RATES);
      case "bgoals":
      case "sgoals":
        return !Array.isArray(value) || value.length === 0;
      case "prof":
        return value == null || value === "healthcare";
      case "profSub":
        return value == null || value === "nurse_rn";
      case "appName":
        return !value || value === "Trackfi";
      case "greetName":
        return !value;
      default:
        // Unknown slice: treat as default (do nothing) — zero-data-loss rule.
        return true;
    }
  } catch {
    return true;
  }
}

/**
 * Gate for config/profile slices (income, goals, cats, settings, household, dashConfig,
 * prof*, appName, greetName, calColors, taccount, accountRates).
 *
 * Signed-in users may only persist a slice when either:
 *   - cloud hydration is confirmed for this session (rows pulled / confirmed-empty /
 *     explicit user data creation) and the sync phase is READY, or
 *   - the value is provably non-default (came from local hydration or a user edit).
 * Default values are never persisted before hydration is confirmed, so a pending or
 * failed boot fetch can never push DEF_* state to localStorage or the cloud.
 */
export function shouldPersistConfigSlice({ ready, signedIn, slice, value }) {
  if (!ready) return false;
  if (!signedIn) return true;
  if (isCloudHydrationConfirmed() && isSyncReady()) return true;
  return !isDefaultSliceValue(slice, value);
}
