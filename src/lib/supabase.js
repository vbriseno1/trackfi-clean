/**
 * Supabase REST + scoped localStorage sync layer for Trackfi.
 * Kept separate from App.jsx for testing and bundle clarity.
 */

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

let _onSessionExpired = null;

export function setSessionExpiredHandler(fn) {
  _onSessionExpired = fn;
}

/** Invoke the registered session-expired callback (e.g. after refresh token failure). */
export function triggerSessionExpired() {
  _onSessionExpired?.();
}

export { SUPA_URL, SUPA_KEY, VAPID_PUBLIC_KEY };

export async function supaFetch(path, opts = {}) {
  if (!SUPA_URL || !SUPA_KEY)
    return { data: null, error: { message: "Supabase is not configured (set VITE_SUPABASE_* in .env)" } };
  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem("fv_session") || "null");
    } catch {
      return null;
    }
  })();
  const token = session?.access_token;
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPA_KEY,
    ...(token ? { Authorization: "Bearer " + token } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(SUPA_URL + path, {
    ...opts,
    cache: opts.cache ?? "no-store",
    headers,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: "Request failed" }));
    if (res.status === 401) _onSessionExpired?.();
    return { data: null, error: e };
  }
  const data = await res.json().catch(() => ({}));
  return { data, error: null };
}

export async function signUp(email, password) {
  if (!SUPA_URL || !SUPA_KEY) return { error: { message: "Supabase is not configured (set VITE_SUPABASE_* in .env)" } };
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    const res = await fetch(SUPA_URL + "/auth/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPA_KEY },
      body: JSON.stringify({ email, password, options: { emailRedirectTo: redirectTo } }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ message: "Request failed" }));
      return { error: e };
    }
    const r = await res.json();
    if (r.access_token)
      try {
        localStorage.setItem("fv_session", JSON.stringify(r));
      } catch {}
    return r;
  } catch (e) {
    return { error: { message: e.message || "Network error" } };
  }
}

export async function signIn(email, password) {
  if (!SUPA_URL || !SUPA_KEY) return { error: { message: "Supabase is not configured (set VITE_SUPABASE_* in .env)" } };
  try {
    const res = await fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPA_KEY },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ message: "Request failed" }));
      return { error: e };
    }
    const r = await res.json();
    if (r.access_token)
      try {
        localStorage.setItem("fv_session", JSON.stringify(r));
      } catch {}
    return r;
  } catch (e) {
    return { error: { message: e.message || "Network error" } };
  }
}

export function getScope() {
  try {
    const s = JSON.parse(localStorage.getItem("fv_session") || "null");
    if (s?.user?.id) return "fv6_" + s.user.id.slice(0, 8) + ":";
    let d = localStorage.getItem("fv_device_id");
    if (!d) {
      d = "d_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("fv_device_id", d);
    }
    return "fv6_" + d + ":";
  } catch {
    return "fv6_local:";
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem("fv_session") || "null");
  } catch {
    return null;
  }
}

export function getUserId() {
  return getSession()?.user?.id || null;
}

/** Kept for minimal churn in callers that used the old name */
export const _getUserId = getUserId;

/** Sample-data mode: cloud sync must not read or write so demo never overwrites a real account. */
export function isTrackfiDemoMode() {
  try {
    return localStorage.getItem("fv_demo") === "1";
  } catch {
    return false;
  }
}

/** Bare `user_data.key` values — single list for cache clear, offline mirror, and authoritative sync. */
export const SCOPED_USER_DATA_KEYS = [
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
  "household",
  "accountRates",
  "onboarded",
];

export function clearScopedUserDataCache() {
  try {
    const scope = getScope();
    for (const bare of SCOPED_USER_DATA_KEYS) {
      try {
        localStorage.removeItem(scope + bare);
      } catch {}
      try {
        localStorage.removeItem("fv6:" + bare);
      } catch {}
    }
  } catch {}
}

const _ssBuffer = {};
let _lsQuotaWarned = false;

/** Last `updated_at` we saw from Supabase per key — used so stale tabs cannot overwrite newer cloud rows. */
const _lastKnownRowUpdatedAt = Object.create(null);

/** After each successful pull, replace version map from REST rows `{ key, value, updated_at }`. */
export function applyPulledUserDataRows(rows) {
  for (const k of SCOPED_USER_DATA_KEYS) delete _lastKnownRowUpdatedAt[k];
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (row == null || row.key == null) continue;
    if (row.updated_at != null && row.updated_at !== "") _lastKnownRowUpdatedAt[row.key] = String(row.updated_at);
  }
}

export function clearUserDataRowVersions() {
  for (const k of Object.keys(_lastKnownRowUpdatedAt)) delete _lastKnownRowUpdatedAt[k];
}

let _uploadConflictHandler = null;
/** Optional: `() => void` — e.g. schedule `loadFromSupabase` when a background PATCH hits a version conflict. */
export function setUploadConflictHandler(fn) {
  _uploadConflictHandler = typeof fn === "function" ? fn : null;
}

let _conflictPullScheduled = false;
function scheduleConflictPull() {
  if (_conflictPullScheduled) return;
  _conflictPullScheduled = true;
  queueMicrotask(() => {
    _conflictPullScheduled = false;
    try {
      _uploadConflictHandler?.();
    } catch {}
  });
}

/**
 * @returns {{ ok: true } | { conflict: true } | { error: true }}
 */
async function _flushKey(uid, bare, v) {
  const nextUpdatedAt = new Date().toISOString();
  const lastTs = _lastKnownRowUpdatedAt[bare];
  try {
    if (lastTs) {
      const r = await supaFetch(
        `/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}&key=eq.${encodeURIComponent(bare)}&updated_at=eq.${encodeURIComponent(lastTs)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ value: v, updated_at: nextUpdatedAt }),
        }
      );
      if (r.error) return { error: true };
      const raw = r.data;
      if (Array.isArray(raw)) {
        if (raw.length === 1 && raw[0]?.updated_at != null) {
          _lastKnownRowUpdatedAt[bare] = String(raw[0].updated_at);
          try {
            localStorage.setItem("fv_last_sync", String(Date.now()));
          } catch {}
          return { ok: true };
        }
        if (raw.length === 0) {
          scheduleConflictPull();
          return { conflict: true };
        }
        return { error: true };
      }
      _lastKnownRowUpdatedAt[bare] = nextUpdatedAt;
      try {
        localStorage.setItem("fv_last_sync", String(Date.now()));
      } catch {}
      return { ok: true };
    }
    const r2 = await supaFetch("/rest/v1/user_data?on_conflict=user_id,key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: uid, key: bare, value: v, updated_at: nextUpdatedAt }),
    });
    if (r2.error) return { error: true };
    const rows2 = Array.isArray(r2.data) ? r2.data : [];
    if (rows2.length === 1 && rows2[0]?.updated_at != null) _lastKnownRowUpdatedAt[bare] = String(rows2[0].updated_at);
    else _lastKnownRowUpdatedAt[bare] = nextUpdatedAt;
    try {
      localStorage.setItem("fv_last_sync", String(Date.now()));
    } catch {}
    return { ok: true };
  } catch {
    return { error: true };
  }
}

export async function sg(k) {
  const uid = getUserId();
  const bare = k.replace("fv6:", "");
  if (uid && !isTrackfiDemoMode()) {
    try {
      const res = await supaFetch(
        `/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}&key=eq.${encodeURIComponent(bare)}&select=value,updated_at`
      );
      if (Array.isArray(res?.data) && res.data.length > 0) {
        const row = res.data[0];
        if (row != null && Object.prototype.hasOwnProperty.call(row, "value")) {
          if (row.updated_at != null && row.updated_at !== "") _lastKnownRowUpdatedAt[bare] = String(row.updated_at);
          return row.value;
        }
      }
    } catch {}
  }
  try {
    const scoped = localStorage.getItem(getScope() + bare);
    if (scoped !== null) return JSON.parse(scoped);
    const legacy = localStorage.getItem(k);
    return legacy ? JSON.parse(legacy) : null;
  } catch {
    return null;
  }
}

export async function ss(k, v) {
  const uid = getUserId();
  const bare = k.replace("fv6:", "");
  try {
    localStorage.setItem(getScope() + bare, JSON.stringify(v));
  } catch (e) {
    if (
      !_lsQuotaWarned &&
      (e?.name === "QuotaExceededError" || e?.code === 22 || /quota/i.test(String(e?.message || "")))
    ) {
      _lsQuotaWarned = true;
      console.warn(
        "[Trackfi] Storage is full — data may not save offline. Export JSON in Settings → Data, then free space or reset old data."
      );
    }
  }
  if (uid && !isTrackfiDemoMode()) {
    if (_ssBuffer[bare]?.timer) clearTimeout(_ssBuffer[bare].timer);
    const buf = { value: v, timer: null };
    buf.timer = setTimeout(() => {
      try {
        if (_ssBuffer[bare] !== buf) return;
        let val;
        try {
          const raw = localStorage.getItem(getScope() + bare);
          if (raw !== null) val = JSON.parse(raw);
        } catch {}
        if (val === undefined) val = buf.value;
        if (val !== undefined) void _flushKey(uid, bare, val);
      } finally {
        if (_ssBuffer[bare] === buf) delete _ssBuffer[bare];
      }
    }, 1500);
    _ssBuffer[bare] = buf;
  }
}

/**
 * Clears debounced upload timers without sending. Call before applying a server snapshot
 * on pull so a stale scheduled ss() cannot POST old JSON after newer remote data was fetched.
 */
export function cancelPendingDebouncedSync() {
  for (const bare of Object.keys(_ssBuffer)) {
    const buf = _ssBuffer[bare];
    if (buf?.timer) clearTimeout(buf.timer);
    delete _ssBuffer[bare];
  }
}

export async function flushPendingSync() {
  const uid = getUserId();
  const allowCloud = !!uid && !isTrackfiDemoMode();
  const keys = Object.keys(_ssBuffer);
  let conflict = false;
  for (const bare of keys) {
    const buf = _ssBuffer[bare];
    if (!buf) continue;
    if (buf.timer) clearTimeout(buf.timer);
    if (allowCloud) {
      let val = buf.value;
      try {
        const raw = localStorage.getItem(getScope() + bare);
        if (raw !== null) val = JSON.parse(raw);
      } catch {}
      if (val !== undefined) {
        const out = await _flushKey(uid, bare, val);
        if (out?.conflict) conflict = true;
      }
    }
    delete _ssBuffer[bare];
  }
  return { conflict };
}
