import { describe, expect, it, beforeEach } from "vitest";
import { setSyncPhase, SYNC_PHASE, resetSyncLifecycle } from "./syncLifecycle.js";
import { shouldPersistFinanceSlice } from "./financePersistence.js";

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
