import { test, expect } from '@playwright/test'

/**
 * Offline, post-onboarding shell. Avoids auth screen and PIN.
 * No real Supabase session — cloud sync paths are not covered here.
 */
const PIN_1234_HASH = 'ccdf7233fe3d5f2964fc6e67635bd6119e822f998128017239377d6c82402e6e'

test.beforeEach(async ({ context }, testInfo) => {
  if (testInfo.title.includes('[fresh]')) return
  const pinHash = testInfo.title.includes('[pin]') ? PIN_1234_HASH : null
  await context.addInitScript((hash) => {
    localStorage.setItem('fv_skip_auth', '1')
    localStorage.setItem('fv_onboarded', '1')
    if (hash) localStorage.setItem('fv_pin_hash', hash)
    else localStorage.removeItem('fv_pin_hash')
    localStorage.removeItem('fv_session')
    localStorage.removeItem('fv_pw_reset')
    localStorage.removeItem('fv_demo')
  }, pinHash)
})

async function expectHomeLoaded(page) {
  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 45_000 })
}

function futureDate(days = 3) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

test.describe('Trackfi release pass', () => {
  test('[fresh] Try without account opens onboarding', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Trackfi').first()).toBeVisible({ timeout: 45_000 })
    await page.getByRole('button', { name: /Try without account/i }).click()
    await expect(page.getByText(/The finance app that actually works/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Get Started/i })).toBeVisible()
  })

  test('[fresh] onboarding can complete with skipped financial details', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Try without account/i }).click()
    await page.getByRole('button', { name: /Get Started/i }).click()
    await page.getByPlaceholder('Your name').fill('E2E User')
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.getByRole('button', { name: /Just me/i }).click()
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.getByRole('button', { name: /Skip for now/i }).click()
    await page.getByRole('button', { name: /Skip for now/i }).click()
    await expectHomeLoaded(page)
  })

  test('[pin] PIN lock unlocks with a seeded valid PIN', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Enter your PIN to continue')).toBeVisible({ timeout: 45_000 })
    await page.locator('input[type="password"]').fill('1234')
    await page.getByRole('button', { name: 'Unlock' }).click()
    await expectHomeLoaded(page)
  })

  test('home loads after boot', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)
    await expect(page.locator('#fv-scroll')).toBeVisible()
  })

  test('bottom nav: Spending and Bills', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'Spending' }).click()
    await expect(page.getByText('Total:', { exact: false }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Bills' }).click()
    await expect(page.getByText(/unpaid/i).first()).toBeVisible()
  })

  test('core flow: log an expense from home', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'Log expense' }).click()
    await expect(page.getByText('Log Expense')).toBeVisible()
    await page.getByLabel('Name').fill('E2E Coffee')
    await page.getByLabel('Amount ($)').fill('4.75')
    await page.getByLabel('Category').selectOption('Coffee')
    await page.getByRole('button', { name: 'Add Expense' }).click()

    await page.getByRole('button', { name: 'Spending' }).click()
    await expect(page.getByText('E2E Coffee')).toBeVisible()
    await expect(page.getByText('$4.75').first()).toBeVisible()
  })

  test('core flow: edit and delete an expense', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'Log expense' }).click()
    await page.getByLabel('Name').fill('E2E Edit Coffee')
    await page.getByLabel('Amount ($)').fill('5.25')
    await page.getByLabel('Category').selectOption('Coffee')
    await page.getByRole('button', { name: 'Add Expense' }).click()
    await page.getByRole('button', { name: 'Spending' }).click()
    await page.getByText('E2E Edit Coffee').click()
    await expect(page.getByText('Edit Expense')).toBeVisible()
    await page.getByLabel('Name').fill('E2E Edited Coffee')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('E2E Edited Coffee')).toBeVisible()
    await page.getByText('E2E Edited Coffee').click()
    await page.getByRole('button', { name: /Delete/i }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('E2E Edited Coffee')).toHaveCount(0)
  })

  test('core flow: add a bill and mark it paid', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'Bills' }).click()
    await page.getByRole('button', { name: /Add bill/i }).first().click()
    await expect(page.getByText('Add Bill')).toBeVisible()
    await page.getByLabel('Bill Name').fill('E2E Internet')
    await page.getByLabel('Amount ($)').fill('79.99')
    await page.getByLabel('Due Date').fill(futureDate())
    await page.getByLabel('Recurring').selectOption('One-time')
    await page.getByLabel('Pay from (when you mark paid)').selectOption('none')
    await page.getByRole('button', { name: 'Add Bill' }).last().click()

    await expect(page.getByText('E2E Internet')).toBeVisible()
    await page.getByRole('button', { name: 'Mark E2E Internet paid' }).click()
    await expect(page.getByText(/Paid — E2E Internet/i).first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Paid History/ }).click()
    await expect(page.getByText('E2E Internet')).toBeVisible()
  })

  test('paid bill delete reverses checking balance', async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('fv_device_id', 'd_billdelete')
      localStorage.setItem(
        'fv6_d_billdelete:accounts',
        JSON.stringify({
          checking: '500',
          savings: '',
          cushion: '',
          credit_card: '',
          investments: '',
          k401: '',
          roth_ira: '',
          brokerage: '',
          crypto: '',
          hsa: '',
          property: '',
          vehicles: '',
          cashAccounts: [],
        }),
      )
    })
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'Bills' }).click()
    await page.getByRole('button', { name: /Add bill/i }).first().click()
    await page.getByLabel('Bill Name').fill('E2E Reversal Bill')
    await page.getByLabel('Amount ($)').fill('50')
    await page.getByLabel('Due Date').fill(futureDate())
    await page.getByLabel('Recurring').selectOption('One-time')
    await page.getByLabel('Pay from (when you mark paid)').selectOption('checking')
    await page.getByRole('button', { name: 'Add Bill' }).last().click()
    await page.getByRole('button', { name: 'Mark E2E Reversal Bill paid' }).click()
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(localStorage.getItem('fv6_d_billdelete:accounts') || '{}').checking),
      )
      .toBe('450')

    await page.getByRole('button', { name: /Paid History/ }).click()
    await page.getByRole('button', { name: 'Delete E2E Reversal Bill' }).click()
    await expect(page.getByText(/payment reversed/i).first()).toBeVisible()
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(localStorage.getItem('fv6_d_billdelete:accounts') || '{}').checking),
      )
      .toBe('500')
  })

  test('core flow: add debt with linked bill and mark payment paid', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Debt Tracker' }).click()
    await page.getByRole('button', { name: /Add Debt/i }).click()
    await expect(page.getByText('Add Debt')).toBeVisible()
    await page.getByLabel('Name').fill('E2E Car Loan')
    await page.getByLabel('Balance ($)').fill('1000')
    await page.getByLabel('Original ($)').fill('1000')
    await page.getByLabel('Rate %').fill('6')
    await page.getByLabel('Min Payment ($)').fill('100')
    await page.getByRole('button', { name: 'Track Debt' }).click()
    await expect(page.getByText('E2E Car Loan')).toBeVisible()

    await page.getByRole('button', { name: 'Bills' }).click()
    await expect(page.getByText('E2E Car Loan payment')).toBeVisible()
    await page.getByRole('button', { name: 'Mark E2E Car Loan payment paid' }).click()
    await expect(page.getByText(/Paid — E2E Car Loan payment/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('AI Logger tab', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'Log', exact: true }).click()
    await expect(page.getByText('AI Logger')).toBeVisible()
    await expect(page.getByText(/Natural-language finance logger/i)).toBeVisible()
  })

  test('More hub → Settings', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await expect(page.getByText('All your financial tools')).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByText('Profile').first()).toBeVisible()
    await expect(page.getByText('Dark Mode').first()).toBeVisible()
  })

  test('Settings shows Cloud & device section', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByText('Cloud & device')).toBeVisible()
    await expect(page.getByRole('status', { name: 'Save and sync status' })).toBeVisible()
    const browserOnly = page.getByText('Browser-only mode')
    const deviceOnly = page.getByText('Device-only mode')
    await expect(browserOnly.or(deviceOnly).first()).toBeVisible()
    await expect(page.getByText(/Offline/i).first()).toBeVisible()
  })

  test('Settings explains missing Supabase or local-only sync', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    const missingConfig = page.getByText(/Cloud sign-in and sync aren’t configured/i)
    const localOnly = page.getByText(/everything is stored in this browser only/i)
    await expect(missingConfig.or(localOnly).first()).toBeVisible()
  })

  test('More → Household / Shared and Settle Up tab', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await expect(page.getByText('All your financial tools')).toBeVisible()
    await page.getByRole('button', { name: 'Household / Shared' }).click()
    await expect(page.getByText('My Finances').first()).toBeVisible()
    await page.getByRole('button', { name: 'Settle Up' }).click()
    await expect(page.getByText('Current Balances')).toBeVisible()
  })

  test('More → Accounts & Income', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Accounts & Income' }).click()
    await expect(page.getByText('Auto-saved').first()).toBeVisible()
  })

  test('More → Debt Tracker', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Debt Tracker' }).click()
    await expect(page.getByText('Debt Tracker').first()).toBeVisible()
  })

  test('More → Spending Insights (charts idle-load)', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Spending Insights 📊' }).click()
    await expect(page.getByText('Spending Insights').first()).toBeVisible({ timeout: 25_000 })
  })

  test('dark mode toggle sets body.dark-mode', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    const wasDark = await page.evaluate(() => document.body.classList.contains('dark-mode'))
    const moonBtn = page.locator('button.ba').filter({ has: page.locator('svg.lucide-moon') })
    const sunBtn = page.locator('button.ba').filter({ has: page.locator('svg.lucide-sun') })
    if (wasDark) {
      await sunBtn.first().click()
      await expect.poll(async () => page.evaluate(() => document.body.classList.contains('dark-mode'))).toBe(false)
      await moonBtn.first().click()
      await expect.poll(async () => page.evaluate(() => document.body.classList.contains('dark-mode'))).toBe(true)
    } else {
      await moonBtn.first().click()
      await expect.poll(async () => page.evaluate(() => document.body.classList.contains('dark-mode'))).toBe(true)
      await sunBtn.first().click()
      await expect.poll(async () => page.evaluate(() => document.body.classList.contains('dark-mode'))).toBe(false)
    }
  })

  test('Export Center opens from More → Export Data', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Export Data' }).click()
    await expect(page.getByText('Download your financial data').first()).toBeVisible()
    await page.getByRole('button', { name: 'Open Export Center' }).click()
    await expect(page.getByText('Export Center')).toBeVisible()
    await expect(page.getByText('Monthly Statement').first()).toBeVisible()
  })

  test('Settings → Export JSON starts a backup download', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export JSON' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/backup\.json$/)
  })

  test('Settings reset all data can be cancelled and confirmed', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Reset All Data' }).click()
    await expect(page.getByText('Reset All Data')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Profile').first()).toBeVisible()
    await page.getByRole('button', { name: 'Reset All Data' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('button', { name: /Get Started/i })).toBeVisible({ timeout: 15_000 })
  })

  test('Bank Import path from More', async ({ page }) => {
    await page.goto('/')
    await expectHomeLoaded(page)

    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('button', { name: 'Import Bank CSV' }).click()
    await expect(page.getByText('Open Bank Import').first()).toBeVisible()
    await page.getByRole('button', { name: 'Open Bank Import' }).click()
    await expect(page.getByText(/Paste CSV from your bank/i)).toBeVisible({ timeout: 15_000 })
  })
})
