import { describe, expect, it } from 'vitest';
import { parseTrackfiBackupJson, validateTrackfiBackup } from './dataBackup.js';

describe('backup validation', () => {
  it('rejects invalid JSON before restore can write state', () => {
    expect(parseTrackfiBackupJson('{bad json').ok).toBe(false);
  });

  it('rejects malformed backup fields', () => {
    const result = validateTrackfiBackup({ expenses: {}, accounts: [] });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(['expenses must be a list.', 'accounts must be an object.']));
  });

  it('accepts a valid partial Trackfi backup', () => {
    const result = parseTrackfiBackupJson(JSON.stringify({ expenses: [], accounts: { checking: '100' }, onboarded: true }));
    expect(result.ok).toBe(true);
    expect(result.data.accounts.checking).toBe('100');
  });
});
