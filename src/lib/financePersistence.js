import { isSyncReady } from "./syncLifecycle.js";

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
