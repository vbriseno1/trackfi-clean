/** Debts tagged as revolving credit — charges post to this balance */
export function isCreditCardDebt(d) {
  return d && d.debtKind === "credit_card";
}

export function cardDebtsList(debts) {
  return (debts || []).filter(isCreditCardDebt);
}

/** Legacy `accounts.credit_card` only when no structured credit-card debts exist. */
export function legacyCreditCardOwed(accounts, debts) {
  return cardDebtsList(debts).length ? 0 : parseFloat(accounts?.credit_card || 0);
}
