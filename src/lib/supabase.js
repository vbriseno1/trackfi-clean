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

/** Bare keys mirrored under getScope() + key and legacy fv6:key — clear on full reset so demo/stale rows cannot return after cloud wipe or reload. */
const SCOPED_USER_DATA_KEYS = [
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

async function _flushKey(uid, bare, v) {
  try {
    const r = await supaFetch("/rest/v1/user_data?on_conflict=user_id,key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: uid, key: bare, value: v, updated_at: new Date().toISOString() }),
    });
    if (!r.error)
      try {
        localStorage.setItem("fv_last_sync", String(Date.now()));
      } catch {}
  } catch {}
}

export async function sg(k) {
  const uid = getUserId();
  const bare = k.replace("fv6:", "");
  if (uid && !isTrackfiDemoMode()) {
    try {
      const res = await supaFetch(
        `/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}&key=eq.${encodeURIComponent(bare)}&select=value`
      );
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data[0].value;
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
    _ssBuffer[bare] = {
      value: v,
      timer: setTimeout(() => _flushKey(uid, bare, _ssBuffer[bare].value), 1500),
    };
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
      if (val !== undefined) await _flushKey(uid, bare, val);
    }
    delete _ssBuffer[bare];
  }
}
