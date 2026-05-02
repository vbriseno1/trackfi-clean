function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function optimizedSettlementPairs(balances) {
  const debtors = (balances || [])
    .filter((m) => m.balance < -0.5)
    .map((m) => ({ ...m, remaining: round2(Math.abs(m.balance)) }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = (balances || [])
    .filter((m) => m.balance > 0.5)
    .map((m) => ({ ...m, remaining: round2(m.balance) }))
    .sort((a, b) => b.remaining - a.remaining);
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].remaining, creditors[j].remaining));
    if (amount > 0.5) pairs.push({ from: debtors[i], to: creditors[j], amount });
    debtors[i].remaining = round2(debtors[i].remaining - amount);
    creditors[j].remaining = round2(creditors[j].remaining - amount);
    if (debtors[i].remaining <= 0.5) i++;
    if (creditors[j].remaining <= 0.5) j++;
  }
  return pairs;
}
