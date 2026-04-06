/**
 * Browser checks for `npm run test:e2e` (invoked from with-server.mjs via Playwright library).
 */
export async function runReleaseChecks(page) {
  const home = async () => {
    await page.goto('/')
    await page.getByText(/Good (morning|afternoon|evening)/).waitFor({ state: 'visible', timeout: 45_000 })
  }

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
  await page.getByRole('button', { name: 'Log', exact: true }).click()
  await page.getByText('AI Logger').waitFor({ state: 'visible' })
  await page.getByText(/Natural-language finance logger/i).waitFor({ state: 'visible' })

  await home()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByText('All your financial tools').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByText('Profile').first().waitFor({ state: 'visible' })
  await page.getByText('Dark Mode').first().waitFor({ state: 'visible' })

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
