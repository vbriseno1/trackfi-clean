import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

function freshStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  }
}

describe('supabase helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('getScope uses first 8 chars of user id when session present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'k')
    vi.stubGlobal('localStorage', freshStorage())
    localStorage.setItem(
      'fv_session',
      JSON.stringify({ user: { id: 'abcdefghijklmnop' } })
    )
    vi.resetModules()
    const { getScope } = await import('./supabase.js')
    expect(getScope()).toBe('fv6_abcdefgh:')
  })

  it('getScope falls back to device bucket when logged out', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'k')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { getScope } = await import('./supabase.js')
    const s = getScope()
    expect(s).toMatch(/^fv6_d_[a-z0-9]+:$/)
  })

  it('clearScopedUserDataCache removes scoped and legacy fv6 keys', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'k')
    vi.stubGlobal('localStorage', freshStorage())
    localStorage.setItem(
      'fv_session',
      JSON.stringify({ user: { id: 'abcdefghijklmnop' } })
    )
    vi.resetModules()
    const { getScope, clearScopedUserDataCache } = await import('./supabase.js')
    const scope = getScope()
    localStorage.setItem(scope + 'expenses', JSON.stringify([{ id: 1 }]))
    localStorage.setItem('fv6:expenses', JSON.stringify([{ id: 2 }]))
    localStorage.setItem(scope + 'recurring_last', '2024-01-01')
    localStorage.setItem(scope + 'recurring_skip_err', '2024-01-01')
    clearScopedUserDataCache()
    expect(localStorage.getItem(scope + 'expenses')).toBeNull()
    expect(localStorage.getItem('fv6:expenses')).toBeNull()
    expect(localStorage.getItem(scope + 'recurring_last')).toBeNull()
    expect(localStorage.getItem(scope + 'recurring_skip_err')).toBeNull()
  })

  it('isSupabaseConfigured is false without url/key and true when both set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.resetModules()
    let { isSupabaseConfigured } = await import('./supabase.js')
    expect(isSupabaseConfigured()).toBe(false)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.resetModules()
    ;({ isSupabaseConfigured } = await import('./supabase.js'))
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('supaFetch returns config error when env missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { supaFetch } = await import('./supabase.js')
    const r = await supaFetch('/rest/v1/x')
    expect(r.data).toBeNull()
    expect(r.error?.message).toMatch(/not configured/i)
  })

  it('supaFetch merges json on success', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { supaFetch } = await import('./supabase.js')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }],
    })
    const r = await supaFetch('/rest/v1/user_data?select=*')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/user_data?select=*',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({
          apikey: 'anon',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ id: 1 }])
  })

  it('supaFetch returns timeout message when fetch is aborted', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { supaFetch } = await import('./supabase.js')
    globalThis.fetch = vi.fn((_url, init) => {
      return new Promise((_res, rej) => {
        init.signal.addEventListener('abort', () => {
          rej(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
        })
      })
    })
    const r = await supaFetch('/slow', { timeoutMs: 1 })
    expect(r.data).toBeNull()
    expect(r.error?.message).toMatch(/timed out/i)
  })

  it('supaFetch uses no-store by default for caching', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { supaFetch } = await import('./supabase.js')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    await supaFetch('/x')
    expect(globalThis.fetch.mock.calls[0][1].cache).toBe('no-store')
  })

  it('supaFetch invokes session-expired hook on 401', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { supaFetch, setSessionExpiredHandler } = await import('./supabase.js')
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'jwt' }),
    })
    await supaFetch('/p')
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('triggerSessionExpired calls registered handler', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { setSessionExpiredHandler, triggerSessionExpired } = await import('./supabase.js')
    const fn = vi.fn()
    setSessionExpiredHandler(fn)
    triggerSessionExpired()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('sg encodes user_id and key in REST filter', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    localStorage.setItem(
      'fv_session',
      JSON.stringify({ user: { id: 'abc&weird' }, access_token: 'tok' })
    )
    vi.resetModules()
    const { sg } = await import('./supabase.js')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ value: { ok: 1 } }],
    })
    await sg('fv6:expenses+special')
    expect(globalThis.fetch).toHaveBeenCalled()
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain(encodeURIComponent('abc&weird'))
    expect(url).toContain(encodeURIComponent('expenses+special'))
  })

  it('sg quarantines corrupt local JSON instead of repeatedly reading it', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.stubGlobal('localStorage', freshStorage())
    vi.resetModules()
    const { getScope, sg } = await import('./supabase.js')
    const key = getScope() + 'expenses'
    localStorage.setItem(key, '{bad json')
    const out = await sg('fv6:expenses')
    expect(out).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('ss does not schedule cloud upload while demo flag is set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    localStorage.setItem(
      'fv_session',
      JSON.stringify({ user: { id: 'user1234567890' }, access_token: 'tok' })
    )
    localStorage.setItem('fv_demo', '1')
    vi.useFakeTimers()
    vi.resetModules()
    const { ss } = await import('./supabase.js')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    await ss('fv6:expenses', [{ id: 1 }])
    await vi.runAllTimersAsync()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('flushPendingSync returns conflict shape without throwing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    localStorage.setItem(
      'fv_session',
      JSON.stringify({ user: { id: 'user1234567890' }, access_token: 'tok' })
    )
    vi.resetModules()
    const { flushPendingSync } = await import('./supabase.js')
    const r = await flushPendingSync()
    expect(r).toEqual({ conflict: false, error: false, skipped: false })
  })

  it('cancelPendingDebouncedSync clears without throwing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('localStorage', freshStorage())
    localStorage.setItem(
      'fv_session',
      JSON.stringify({ user: { id: 'user1234567890' } })
    )
    vi.resetModules()
    const { ss, cancelPendingDebouncedSync } = await import('./supabase.js')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    await ss('fv6:expenses', [])
    cancelPendingDebouncedSync()
    expect(() => cancelPendingDebouncedSync()).not.toThrow()
  })
})
