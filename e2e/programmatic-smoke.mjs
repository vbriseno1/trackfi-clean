/**
 * Minimal smoke: launches Chromium without the Playwright test runner.
 * Run after `npm run build` and with preview on 4174, or use `npm run test:e2e:smoke`.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const BASE = 'http://127.0.0.1:4174/'
const repoRoot = new globalThis.URL('..', import.meta.url).pathname

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForOk(url, maxMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await wait(300)
  }
  throw new Error(`Timeout waiting for ${url}`)
}

const preview = spawn('npm', ['run', 'preview:e2e'], {
  shell: true,
  stdio: 'inherit',
  cwd: repoRoot,
})

try {
  await waitForOk(BASE)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const txt = await page.locator('body').innerText({ timeout: 10_000 })
  if (!/Trackfi/i.test(txt) && !/Good (morning|afternoon|evening)/i.test(txt)) {
    throw new Error('Home body missing expected Trackfi shell copy')
  }
  await browser.close()
  console.log('e2e programmatic-smoke: OK')
} finally {
  preview.kill('SIGTERM')
  await wait(500)
}
