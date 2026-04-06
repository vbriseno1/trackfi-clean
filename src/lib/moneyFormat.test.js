import { describe, it, expect } from 'vitest'
import { fmt, fmtK, todayStr } from './moneyFormat.js'

describe('moneyFormat', () => {
  it('fmt formats USD with two decimals', () => {
    expect(fmt(1234.5)).toMatch(/1,234\.50/)
  })

  it('fmt treats NaN as zero', () => {
    expect(fmt('x')).toBe('$0.00')
  })

  it('fmtK uses compact k for large values', () => {
    expect(fmtK(1500)).toContain('k')
    expect(fmtK(500)).toMatch(/\$500/)
  })

  it('todayStr is YYYY-MM-DD', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
