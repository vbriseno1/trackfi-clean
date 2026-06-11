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
- **READY** — local persistence open; cloud uploads additionally require hydration confirmation (below)

There is **no early-READY safety timeout**. Boot blocks (loading screen, all persistence
off) until the bulk fetch resolves, confirms an empty account, or definitively fails after
bounded retries (`supaFetchUserDataRowsWithRetry`, ≤45s deadline, "Having trouble
connecting..." shown while retrying).

## Cloud hydration confirmation (zero-data-loss gate)

`markCloudHydrationConfirmed()` / `isCloudHydrationConfirmed()` in `syncLifecycle.js`.
Signed-in cloud uploads (`ss` debounce + `flushPendingSync`) are blocked until the session
has positively learned the cloud's state:

- authoritative pull returned rows, or
- cloud confirmed empty (zero `user_data` rows / reset-all delete), or
- explicit user data creation (onboarding completion, backup import).

A failed or pending boot fetch therefore can never upload empty/default state. READY
without confirmation is a degraded mode: app usable, local saves on, uploads off until a
later pull succeeds. `ss()` also skips exact echoes of pulled values
(`recordCloudEchoValues`), so hydration itself writes nothing back to the cloud.

### Degraded mode — known accepted limitation (bug #9)

When the boot fetch fails after exhausting retries, the cloud state is unknown, so we
hydrate from scoped localStorage and leave hydration **unconfirmed**:

- Edits made during degraded boot are written to **localStorage only** (cloud uploads stay
  blocked — uploads can't race ahead of the server, so they can't clobber newer cloud data).
- When connectivity returns, the next successful **authoritative pull wins**: it overwrites
  React state + scoped storage with the server snapshot. **Any local edits made during the
  degraded window that were not yet uploaded are discarded.**

This is a **known, accepted limitation** for Task 1. The fix is scoped to **Task 3**: a
write-ahead journal of local mutations made while unconfirmed, replayed/merged after the
authoritative pull instead of being overwritten. The degraded boot code path in `App.jsx`
carries a `TODO(bug #9)` marker.

Config slices (income, bgoals, sgoals, cats, settings, household, dashConfig, prof*,
appName, greetName, calColors, taccount, accountRates) are gated by
`shouldPersistConfigSlice`: signed-in users persist only after confirmation, or when the
value is provably non-default (`isDefaultSliceValue` vs `DEF_*`).

## Upload status

`getUploadSyncStatus()` — `pendingCount` (debounced keys), `failedKeys`, `hasUploadProblem`.

Failed uploads surface in Home amber banner + Settings status. Retry via `flushPendingSync()`.

## Changing behavior

1. Policy: `syncPolicy.js` + tests  
2. Hydration: `cloudHydration.js` — do not duplicate in `App.jsx`  
3. Gates: `financePersistence.js` + `syncLifecycle.js`  
4. Run `npm test` && `npm run build`
