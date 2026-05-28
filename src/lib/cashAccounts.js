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

/** Display value for checking / savings / cushion fields in forms and reports. */
export function liquidFieldDisplay(accounts, key) {
  if (key === "checking") return displayCheckingBalance(accounts);
  if (key === "savings") return displaySavingsBalance(accounts);
  return accounts[key] ?? "";
}

/** How many cash sub-rows exist for this kind (cushion uses legacy field only). */
export function liquidFieldSubCount(accounts, key) {
  if (key === "cushion") return 0;
  return cashAccountsByKind(accounts, key).length;
}

export function applyLiquidFieldEdit(accounts, key, value) {
  if (key === "cushion") return { ...accounts, cushion: value };
  return applyLiquidBalanceEdit(accounts, key, value);
}

/**
 * Mirror sub-account totals into legacy checking/savings so backup export, Settings,
 * and Net Worth breakdown stay correct when balances live in cashAccounts[] only.
 */
export function normalizeAccountsForPersistence(accounts) {
  if (!accounts || typeof accounts !== "object") return accounts;
  const out = {
    ...accounts,
    cashAccounts: Array.isArray(accounts.cashAccounts)
      ? accounts.cashAccounts.map((c) => ({ ...c }))
      : [],
  };
  const ch = cashAccountsByKind(out, "checking");
  const sv = cashAccountsByKind(out, "savings");
  if (ch.length > 0) out.checking = String(totalCheckingBalance(out));
  if (sv.length > 0) out.savings = String(totalSavingsBalance(out));
  return out;
}

/** Rows for asset breakdown UIs (Net Worth, exports). */
export function liquidAssetBreakdownRows(accounts) {
  return [
    { l: "Checking", v: liquidFieldDisplay(accounts, "checking"), ic: "🏦" },
    { l: "Savings", v: liquidFieldDisplay(accounts, "savings"), ic: "💰" },
    { l: "Cushion", v: liquidFieldDisplay(accounts, "cushion"), ic: "🛡️" },
    { l: "Investments", v: accounts.investments, ic: "📈" },
    { l: "Property", v: accounts.property, ic: "🏠" },
    { l: "Vehicles", v: accounts.vehicles, ic: "🚗" },
  ];
}
