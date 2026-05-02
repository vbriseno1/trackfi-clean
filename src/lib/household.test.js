import { describe, expect, it } from 'vitest';
import { optimizedSettlementPairs } from './household.js';

describe('optimizedSettlementPairs', () => {
  it('settles multiple household balances without cross-product overpayment', () => {
    const pairs = optimizedSettlementPairs([
      { id: 'a', name: 'A', balance: 50 },
      { id: 'b', name: 'B', balance: 30 },
      { id: 'c', name: 'C', balance: -40 },
      { id: 'd', name: 'D', balance: -40 },
    ]);

    expect(pairs.map((p) => [p.from.id, p.to.id, p.amount])).toEqual([
      ['c', 'a', 40],
      ['d', 'a', 10],
      ['d', 'b', 30],
    ]);
  });
});
