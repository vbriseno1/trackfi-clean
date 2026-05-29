/**
 * Explicit sync lifecycle — replaces ad-hoc `cloudLoadedRef` boolean gates.
 *
 * BOOTING: initial hydrate in progress; block empty-array cloud overwrites for signed-in users.
 * PULLING: authoritative cloud pull in flight; same guard as booting.
 * READY: safe to persist all slices (local always; cloud when signed in).
 */
export const SYNC_PHASE = {
  BOOTING: "booting",
  PULLING: "pulling",
  READY: "ready",
};

let _phase = SYNC_PHASE.BOOTING;
const _listeners = new Set();

export function getSyncPhase() {
  return _phase;
}

export function setSyncPhase(phase) {
  if (_phase === phase) return;
  _phase = phase;
  for (const fn of _listeners) {
    try {
      fn(phase);
    } catch {}
  }
}

/** @param {(phase: string) => void} fn */
export function subscribeSyncPhase(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function isSyncReady() {
  return _phase === SYNC_PHASE.READY;
}

export function resetSyncLifecycle() {
  setSyncPhase(SYNC_PHASE.BOOTING);
}
