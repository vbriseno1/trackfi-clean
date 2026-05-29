import { describe, expect, it, beforeEach } from "vitest";
import {
  SYNC_PHASE,
  getSyncPhase,
  setSyncPhase,
  isSyncReady,
  resetSyncLifecycle,
  subscribeSyncPhase,
} from "./syncLifecycle.js";

describe("syncLifecycle", () => {
  beforeEach(() => {
    resetSyncLifecycle();
  });

  it("starts in booting and becomes ready", () => {
    expect(getSyncPhase()).toBe(SYNC_PHASE.BOOTING);
    expect(isSyncReady()).toBe(false);
    setSyncPhase(SYNC_PHASE.READY);
    expect(isSyncReady()).toBe(true);
  });

  it("notifies subscribers", () => {
    const seen = [];
    const unsub = subscribeSyncPhase((p) => seen.push(p));
    setSyncPhase(SYNC_PHASE.READY);
    unsub();
    expect(seen).toEqual([SYNC_PHASE.READY]);
  });
});
