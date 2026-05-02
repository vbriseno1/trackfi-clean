/**
 * Browser checks for `npm run test:e2e` (invoked from with-server.mjs via Playwright library).
 */
export async function runReleaseChecks(page) {
  const PIN_1234_HASH = 'ccdf7233fe3d5f2964fc6e67635bd6119e822f998128017239377d6c82402e6e'
  const home = async () => {
    await page.goto('/')
    await page.getByText(/Good (morning|afternoon|evening)/).waitFor({ state: 'visible', timeout: 45_000 })
  }
  const futureDate = (days = 3) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.reload()
  await page.getByText('Trackfi').first().waitFor({ state: 'visible', timeout: 45_000 })
  await page.getByRole('button', { name: /Try without account/i }).click()
  await page.getByText(/The finance app that actually works/i).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /Get Started/i }).click()
  await page.getByPlaceholder('Your name').fill('E2E User')
  await page.getByRole('button', { name: /Continue/i }).click()
  await page.getByRole('button', { name: /Just me/i }).click()
  await page.getByRole('button', { name: /Continue/i }).click()
  await page.getByRole('button', { name: /Skip for now/i }).click()
  await page.getByRole('button', { name: /Skip for now/i }).click()
  await page.getByText(/Good (morning|afternoon|evening)/).waitFor({ state: 'visible', timeout: 45_000 })

  await page.evaluate((hash) => {
    localStorage.setItem('fv_pin_hash', hash)
  }, PIN_1234_HASH)
  await page.reload()
  await page.getByText('Enter your PIN to continue').waitFor({ state: 'visible', timeout: 45_000 })
  await page.locator('input[type="password"]').fill('1234')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await page.getByText(/Good (morning|afternoon|evening)/).waitFor({ state: 'visible', timeout: 45_000 })
  await page.evaluate(() => {
    localStorage.removeItem('fv_pin_hash')
  })

  const untilDarkMode = async (expected, timeout = 15_000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const v = await page.evaluate(() => document.body.classList.contains('dark-mode'))
      if (v === expected) return
      await new Promise((r) => setTimeout(r, 150))
    }
    throw new Error(`Expected dark-mode=${expected}`)
  }

  await home()
  await page.locator('#fv-scroll').waitFor({ state: 'visible', timeout: 15_000 })

  await home()
  await page.getByRole('button', { name: 'Spending' }).click()
  await page.getByText('Total:', { exact: false }).first().waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Bills' }).click()
  await page.getByText(/unpaid/i).first().waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'Log expense' }).click()
  await page.getByText('Log Expense').waitFor({ state: 'visible' })
  await page.getByLabel('Name').fill('E2E Coffee')
  await page.getByLabel('Amount ($)').fill('4.75')
  await page.getByLabel('Category').selectOption('Coffee')
  await page.getByRole('button', { name: 'Add Expense' }).click()
  await page.getByRole('button', { name: 'Spending' }).click()
  await page.getByText('E2E Coffee').waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'Bills' }).click()
  await page.getByRole('button', { name: /Add bill/i }).first().click()
  await page.getByText('Add Bill').waitFor({ state: 'visible' })
  await page.getByLabel('Bill Name').fill('E2E Internet')
  await page.getByLabel('Amount ($)').fill('79.99')
  await page.getByLabel('Due Date').fill(futureDate())
  await page.getByLabel('Recurring').selectOption('One-time')
  await page.getByLabel('Pay from (when you mark paid)').selectOption('none')
  await page.getByRole('button', { name: 'Add Bill' }).last().click()
  await page.getByText('E2E Internet').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Mark E2E Internet paid' }).click()
  await page.getByText(/Paid — E2E Internet/i).first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.getByRole('button', { name: /Paid History/ }).click()
  await page.getByText('E2E Internet').waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'Log', exact: true }).click()
  await page.getByText('AI Logger').waitFor({ state: 'visible' })
  await page.getByText(/Natural-language finance logger/i).waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByText('All your financial tools').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByText('Profile').first().waitFor({ state: 'visible' })
  await page.getByText('Dark Mode').first().waitFor({ state: 'visible' })
  await page.getByText('Cloud & device').waitFor({ state: 'visible' })
  await page.getByRole('status', { name: 'Save and sync status' }).waitFor({ state: 'visible' })
  const browserOnly = await page.getByText('Browser-only mode').count()
  const deviceOnly = await page.getByText('Device-only mode').count()
  if (!browserOnly && !deviceOnly) throw new Error('Missing local save/sync status copy')
  const missingConfig = await page.getByText(/Cloud sign-in and sync aren’t configured/i).count()
  const localOnly = await page.getByText(/everything is stored in this browser only/i).count()
  if (!missingConfig && !localOnly) throw new Error('Missing cloud configuration or local-only sync copy')
  await page.getByText(/Offline/i).first().waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Household / Shared' }).click()
  await page.getByText('My Finances').first().waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Settle Up' }).click()
  await page.getByText('Current Balances').waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Accounts & Income' }).click()
  await page.getByText('Auto-saved').first().waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Debt Tracker' }).click()
  await page.getByText('Debt Tracker').first().waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Spending Insights 📊' }).click()
  await page.getByText('Spending Insights').first().waitFor({ state: 'visible', timeout: 25_000 })

  await home()
  const wasDark = await page.evaluate(() => document.body.classList.contains('dark-mode'))
  const moonBtn = page.locator('button.ba').filter({ has: page.locator('svg.lucide-moon') })
  const sunBtn = page.locator('button.ba').filter({ has: page.locator('svg.lucide-sun') })
  if (wasDark) {
    await sunBtn.first().click()
    await untilDarkMode(false)
    await moonBtn.first().click()
    await untilDarkMode(true)
  } else {
    await moonBtn.first().click()
    await untilDarkMode(true)
    await sunBtn.first().click()
    await untilDarkMode(false)
  }

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Export Data' }).click()
  await page.getByText('Download your financial data').first().waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Open Export Center' }).click()
  await page.getByText('Export Center', { exact: true }).waitFor({ state: 'visible' })
  await page.getByText('Monthly Statement').first().waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Import Bank CSV' }).click()
  await page.getByText('Open Bank Import').first().waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Open Bank Import' }).click()
  await page.getByText(/Paste CSV from your bank/i).waitFor({ state: 'visible', timeout: 15_000 })
}
