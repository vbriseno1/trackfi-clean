# Trackfi data sync

## Architecture

```
React state  →  ss() / sg()  →  scoped localStorage  →  debounced Supabase user_data
                     ↑                    ↑
              syncLifecycle          syncPolicy (empty cloud)
              financePersistence     cloudHydration (boot + pull)
```

| Module | Role |
|--------|------|
| `supabase.js` | REST, scope, `ss`/`sg`, versioned upload, upload status |
| `syncLifecycle.js` | `booting` → `pulling` → `ready` (replaces `cloudLoadedRef`) |
| `syncPolicy.js` | Empty cloud, onboarding inference |
| `cloudHydration.js` | Single path for boot bulk + `loadFromSupabase` |
| `financePersistence.js` | When signed-in slices may call `ss()` during boot |
| `userData.js` | Snapshot → React (`bootDefaults` / `cloudPull` / patch) |

## Modes

| Flag | Effect |
|------|--------|
| `fv_session` | User scope + cloud upload |
| `fv_skip_auth` | Device scope only; session ignored; cleared on sign-in |
| `fv_demo` | Sample data; no cloud read/write |
| `fv_onboarded` | Wizard finished; survives empty cloud |

## Empty cloud

Zero `user_data` rows ≠ new user. Use `resolveEmptyCloudPullAction()`:

- **hydrate_local** — read scoped storage, apply to React (boot and pull)
- **wipe_to_defaults** — `resetUserState({ clearOnboarding: true })` only when no local onboarding/data

## Sync lifecycle

- **BOOTING** — initial hydrate; block empty-array overwrites for signed-in users
- **PULLING** — authoritative cloud pull in flight
- **READY** — all persistence gates open

Boot safety timeout (12s) sets `READY` so the app is usable even if network hangs.

## Upload status

`getUploadSyncStatus()` — `pendingCount` (debounced keys), `failedKeys`, `hasUploadProblem`.

Failed uploads surface in Home amber banner + Settings status. Retry via `flushPendingSync()`.

## Changing behavior

1. Policy: `syncPolicy.js` + tests  
2. Hydration: `cloudHydration.js` — do not duplicate in `App.jsx`  
3. Gates: `financePersistence.js` + `syncLifecycle.js`  
4. Run `npm test` && `npm run build`
