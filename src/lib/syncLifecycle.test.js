import { describe, expect, it, beforeEach } from "vitest";
import {
  SYNC_PHASE,
  getSyncPhase,
  setSyncPhase,
  isSyncReady,
  resetSyncLifecycle,
  subscribeSyncPhase,
  markCloudHydrationConfirmed,
  isCloudHydrationConfirmed,
  resetCloudHydrationConfirmed,
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

  it("cloud hydration starts unconfirmed and is independent of READY", () => {
    expect(isCloudHydrationConfirmed()).toBe(false);
    setSyncPhase(SYNC_PHASE.READY);
    // READY alone never confirms hydration — failed boots reach READY too.
    expect(isCloudHydrationConfirmed()).toBe(false);
    markCloudHydrationConfirmed();
    expect(isCloudHydrationConfirmed()).toBe(true);
  });

  it("resetSyncLifecycle and resetCloudHydrationConfirmed clear the confirmation", () => {
    markCloudHydrationConfirmed();
    resetCloudHydrationConfirmed();
    expect(isCloudHydrationConfirmed()).toBe(false);
    markCloudHydrationConfirmed();
    resetSyncLifecycle();
    expect(isCloudHydrationConfirmed()).toBe(false);
  });
});
