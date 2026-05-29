# Trackfi data sync

## Layers

1. **React state** — what the UI shows right now.
2. **Scoped localStorage** — `fv6_<userId8>:<key>` when signed in, `fv6_<deviceId>:<key>` for offline-only (`fv_skip_auth`). Every `ss()` write lands here first.
3. **Supabase `user_data`** — one row per key per user; debounced upload (~1.5s) when signed in, not demo, not offline-only.

## Modes

| Flag | Effect |
|------|--------|
| `fv_session` | User scope + cloud upload |
| `fv_skip_auth` | Ignore session; device scope only; no cloud |
| `fv_demo` | Sample data; no cloud read/write |
| `fv_onboarded` | Device-level “wizard finished”; not cleared by empty cloud |

## Empty cloud is not “delete user”

If Supabase returns **zero** `user_data` rows, the app must not assume a fresh install. Common causes: new account before first upload, upload still debounced, or transient API issues.

Policy lives in `syncPolicy.js`:

- `resolveEmptyCloudAction()` → `hydrate_local` or `wipe_to_defaults`
- `shouldPreserveLocalWhenCloudEmpty()` — `fv_onboarded` or non-empty scoped slices

Only `wipe_to_defaults` calls `resetUserState({ clearOnboarding: true })`.

## Onboarding

- `fv_onboarded=1` survives empty cloud pulls (fast path).
- `fv6:onboarded` syncs to cloud when authenticated.
- `shouldMarkOnboardedFromSnapshot()` — if cloud has expenses/accounts/income but no `onboarded` key (e.g. after sign-out/sign-in), skip the wizard.

## `resetUserState`

Clears financial state and scoped cache. **Onboarding is cleared only when `clearOnboarding: true`** (explicit reset, empty cloud wipe, exit demo offline). Sign-out keeps `fv_onboarded` so returning users are not sent through the wizard unless they reset all data.

## Authoritative pull

`buildAuthoritativeCloudMap` + `applyUserDataSnapshot(..., { cloudPull: true })` — server wins for known keys; missing keys get defaults so stale local rows cannot survive beside newer partial cloud data.

## Changing sync behavior

1. Update `syncPolicy.js` and its tests.
2. Use `resolveEmptyCloudAction()` in `App.jsx` boot and `loadFromSupabase` — do not duplicate empty-cloud checks.
3. Run `npm test` and `npm run build`.
