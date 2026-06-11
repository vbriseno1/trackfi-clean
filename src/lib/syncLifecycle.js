/**
 * Explicit sync lifecycle — replaces ad-hoc `cloudLoadedRef` boolean gates.
 *
 * BOOTING: initial hydrate in progress; block empty-array cloud overwrites for signed-in users.
 * PULLING: authoritative cloud pull in flight; same guard as booting.
 * READY: safe to persist all slices (local always; cloud when signed in).
 *
 * Separately from the phase, `cloud hydration confirmed` tracks whether this session has
 * positively learned the cloud's state for the signed-in user: a pull returned rows, the
 * cloud was confirmed empty (zero rows), or the user explicitly created data (onboarding,
 * backup import). Until confirmed, NO cloud upload may happen — a failed or pending fetch
 * must never let local defaults overwrite real cloud rows. READY without confirmation is
 * a degraded mode: app usable, local saves on, uploads blocked.
 */
export const SYNC_PHASE = {
  BOOTING: "booting",
  PULLING: "pulling",
  READY: "ready",
};

let _phase = SYNC_PHASE.BOOTING;
let _cloudHydrationConfirmed = false;
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

/**
 * Call when this session has positively confirmed the cloud's state:
 * - an authoritative pull returned rows, OR
 * - the cloud was confirmed empty (zero `user_data` rows), OR
 * - the user explicitly created data (onboarding completion, backup import).
 * Until then, signed-in cloud uploads stay blocked (zero-data-loss rule).
 */
export function markCloudHydrationConfirmed() {
  _cloudHydrationConfirmed = true;
}

export function isCloudHydrationConfirmed() {
  return _cloudHydrationConfirmed;
}

export function resetCloudHydrationConfirmed() {
  _cloudHydrationConfirmed = false;
}

export function resetSyncLifecycle() {
  _cloudHydrationConfirmed = false;
  setSyncPhase(SYNC_PHASE.BOOTING);
}
