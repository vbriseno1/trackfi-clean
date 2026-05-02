# Trackfi Next Passes

## Completed in E2E Pass 1
- Added core daily-flow coverage for logging an expense.
- Added core daily-flow coverage for adding a bill and marking it paid.
- Added Settings backup download coverage.
- Mirrored key flows into the release e2e runner.
- Added accessible labels for shared form fields and bill paid/unpaid controls.
- Added fresh onboarding, try-without-account, and seeded PIN unlock coverage.
- Moved auth resend/recover requests onto bounded timeout handling.

## Pass 2: Auth, Onboarding, PIN
- Done: Add e2e coverage for first-run onboarding completion.
- Done: Add e2e coverage for "Try without account" entering the app immediately.
- Done: Add seeded PIN unlock coverage.
- Done: Make auth resend/recover requests use the same bounded timeout behavior as sign in/sign up.

## Pass 3: Sync and Save Confidence
- Done: Add visible saved/syncing/synced/offline states near Settings or account status.
- Done: Add tests for device-only mode copy and missing Supabase copy.
- Add a test or unit harness for device data migration on sign-in.
- Review pagehide/beforeunload sync behavior after `keepalive` changes.

## Pass 4: Main Money Flows
- Done: Add e2e coverage for adding debt.
- Done: Add e2e coverage for linked loan bill creation and payment.
- Done: Add e2e coverage for editing and deleting an expense.
- Done: Add e2e coverage for reset data cancel/confirm.
- Done: Add paid bill delete coverage with balance reversal assertion.
- Done: Add paid bill edit coverage with balance adjustment assertion.
- Done: Guard duplicate bill payment actions and reshow recurring bills for the next cycle.
- Done: Add e2e coverage for duplicate paid clicks and recurring bill reshow.
- Next: Audit import/export/reset edge cases around corrupted local data and backup restore.

## Pass 5: PWA and Update UX
- Add "new version available, reload" UX when the service worker updates.
- Add an e2e or manual checklist for offline shell load.
- Confirm service worker cache behavior after deploy.

## Later
- Extract and unit test bank CSV parsing.
- Extract and unit test AI logger parsing.
- Improve household settle-up math to produce optimized payment pairs.
