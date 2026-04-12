import { test, expect } from '@playwright/test'

/**
 * Offline, post-onboarding shell. Avoids auth screen and PIN.
 */
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('fv_skip_auth', '1')
    localStorage.setItem('fv_onboarded', '1')
    localStorage.removeItem('fv_pin_hash')
    localStorage.removeItem('fv_session')
    localStorage.removeItem('fv_pw_reset')
    localStorage.removeItem('fv_demo')
  })
})

async function expectHomeLoaded(page) {
  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 45_000 })
}

test.describe('Trackfi release pass', () => {
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
    await expect(page.getByText(/Offline/i).first()).toBeVisible()
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
