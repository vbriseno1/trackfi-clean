/**
 * Sync policy — single place for “what happens when cloud vs local disagree”.
 *
 * Storage model (three layers):
 *   1. React state (in-memory UI)
 *   2. Scoped localStorage: `fv6_<user8>:<key>` or `fv6_<device>:<key>` (always written by ss())
 *   3. Supabase `user_data` rows (debounced upload when signed in, not demo, not offline-only)
 *
 * Onboarding completion is stored in TWO places on purpose:
 *   - `fv_onboarded` = "1" in localStorage (fast boot, survives empty cloud)
 *   - `fv6:*:onboarded` via ss() (syncs to cloud when authenticated)
 *
 * Modes (mutually exclusive for writes):
 *   - Signed in: getScope() uses user id; cloud upload enabled
 *   - Offline-only (fv_skip_auth): getUserId() null; device scope only; session ignored
 *   - Demo (fv_demo): cloud upload disabled; sample data isolated
 *
 * Empty cloud (`user_data` has zero rows) does NOT mean “delete this user”.
 * It means “nothing uploaded yet” (new account, offline edits, or upload pending).
 * Only wipe defaults when there is no local onboarding flag AND no local saved slices.
 */
import {
  isLocalOnboardingComplete,
  localUserHasSavedData,
  shouldPreserveLocalWhenCloudEmpty,
} from "./supabase.js";
import { accountsHasPositiveBalance } from "./accountsLogic.js";

export { isLocalOnboardingComplete, localUserHasSavedData, shouldPreserveLocalWhenCloudEmpty };

/** Result of evaluating an empty Supabase user_data response. */
export const EMPTY_CLOUD_ACTION = {
  HYDRATE_LOCAL: "hydrate_local",
  WIPE_TO_DEFAULTS: "wipe_to_defaults",
};

/**
 * Decide how to handle zero rows from Supabase for the current user.
 * @returns {typeof EMPTY_CLOUD_ACTION.HYDRATE_LOCAL | typeof EMPTY_CLOUD_ACTION.WIPE_TO_DEFAULTS}
 */
export function resolveEmptyCloudAction() {
  return shouldPreserveLocalWhenCloudEmpty()
    ? EMPTY_CLOUD_ACTION.HYDRATE_LOCAL
    : EMPTY_CLOUD_ACTION.WIPE_TO_DEFAULTS;
}

/**
 * After a cloud or boot snapshot, treat the user as onboarded if the flag is set
 * or the payload already contains real finance data (e.g. returning sign-in).
 */
export function shouldMarkOnboardedFromSnapshot(map = {}) {
  if (map.onboarded === true) return true;
  if (isLocalOnboardingComplete()) return true;
  try {
    if (map.accounts && accountsHasPositiveBalance(map.accounts)) return true;
    if (parseFloat(map.income?.primary || 0) > 0) return true;
    if (Array.isArray(map.expenses) && map.expenses.length > 0) return true;
    if (Array.isArray(map.bills) && map.bills.length > 0) return true;
  } catch {}
  return false;
}

/** Apply onboarding flags to handlers + localStorage when snapshot warrants it. */
export function applyOnboardingFlagsFromSnapshot(map, setOnboarded) {
  if (!shouldMarkOnboardedFromSnapshot(map)) return;
  try {
    localStorage.setItem("fv_onboarded", "1");
  } catch {}
  try {
    setOnboarded(true);
  } catch {}
}
