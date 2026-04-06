import { describe, it, expect } from 'vitest'
import { escapeHtml } from './escapeHtml.js'

describe('escapeHtml', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml(`a & b <tag> "q" 'x'`)).toBe(
      'a &amp; b &lt;tag&gt; &quot;q&quot; &#39;x&#39;'
    )
  })

  it('handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})
