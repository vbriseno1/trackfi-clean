/**
 * Free port → vite preview → Playwright (library) release checks → stop preview.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'
import { runReleaseChecks } from './steps.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const p = typeof addr === 'object' && addr ? addr.port : null
      srv.close(() => (p != null ? resolve(p) : reject(new Error('no port'))))
    })
    srv.on('error', reject)
  })
}

async function waitForOk(url, maxMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await wait(250)
  }
  throw new Error(`Timeout waiting for ${url}`)
}

const port = await freePort()
const origin = `http://127.0.0.1:${port}`

const viteBin = join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const preview = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

let exitCode = 0
try {
  await waitForOk(`${origin}/`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: origin })
  await context.addInitScript(() => {
    localStorage.setItem('fv_skip_auth', '1')
    localStorage.setItem('fv_onboarded', '1')
    localStorage.removeItem('fv_pin_hash')
    localStorage.removeItem('fv_session')
    localStorage.removeItem('fv_pw_reset')
    localStorage.removeItem('fv_demo')
  })
  const page = await context.newPage()
  try {
    await runReleaseChecks(page)
    console.log('\n✓ e2e/release checks passed\n')
  } catch (e) {
    console.error(e)
    exitCode = 1
  }
  await browser.close()
} catch (e) {
  console.error(e)
  exitCode = 1
} finally {
  preview.kill('SIGTERM')
  await wait(400)
}
process.exit(exitCode)
