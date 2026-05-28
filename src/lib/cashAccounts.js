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

/** Value for Accounts tab checking input — legacy field or sub-account total. */
export function displayCheckingBalance(accounts) {
  const list = cashAccountsByKind(accounts, "checking");
  if (list.length > 0) return String(totalCheckingBalance(accounts));
  return accounts.checking ?? "";
}

export function displaySavingsBalance(accounts) {
  const list = cashAccountsByKind(accounts, "savings");
  if (list.length > 0) return String(totalSavingsBalance(accounts));
  return accounts.savings ?? "";
}

/**
 * Apply edit from Accounts tab top card. Single sub-account → update that row; else legacy fields.
 * @returns {object} next accounts state
 */
export function applyLiquidBalanceEdit(accounts, kind, value) {
  const list = cashAccountsByKind(accounts, kind);
  if (list.length === 1) {
    const ca = (accounts.cashAccounts || []).map((row) =>
      row.kind === kind && String(row.id) === String(list[0].id) ? { ...row, balance: value } : row
    );
    return { ...accounts, cashAccounts: ca };
  }
  if (list.length > 1) return accounts;
  return { ...accounts, [kind]: value };
}
