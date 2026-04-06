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
        headers: expect.objectContaining({
          apikey: 'anon',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ id: 1 }])
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
