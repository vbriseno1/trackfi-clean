/** Sub-accounts: { id, name, kind:'checking'|'savings', balance } — when empty, legacy accounts.checking / accounts.savings apply */
export function cashAccountsByKind(accounts, kind) {
  return (accounts.cashAccounts || []).filter((a) => a.kind === kind);
}
export function totalCheckingBalance(accounts) {
  const list = cashAccountsByKind(accounts, "checking");
  if (list.length === 0) return parseFloat(accounts.checking || 0);
  return list.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
}
export function totalSavingsBalance(accounts) {
  const list = cashAccountsByKind(accounts, "savings");
  if (list.length === 0) return parseFloat(accounts.savings || 0);
  return list.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
}
