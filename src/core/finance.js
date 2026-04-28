export function calculateBalances(transactions) {
  const balances = {};

  transactions.forEach(t => {
    const { amount, paid_by, participants, split_type, split_values } = t;

    participants.forEach(p => {
      if (!balances[p]) balances[p] = 0;
    });

    let shares = {};

    if (split_type === "equal") {
      const value = amount / participants.length;
      participants.forEach(p => (shares[p] = value));
    }

    if (split_type === "exact") {
      shares = split_values;
    }

    if (split_type === "percentage") {
      participants.forEach(p => {
        shares[p] = amount * (split_values[p] / 100);
      });
    }

    if (split_type === "shares") {
      const totalShares = Object.values(split_values).reduce((a, b) => a + b, 0);
      participants.forEach(p => {
        shares[p] = amount * (split_values[p] / totalShares);
      });
    }

    participants.forEach(p => {
      balances[p] -= shares[p];
    });

    balances[paid_by] += amount;
  });

  return balances;
}

export function settleDebts(balances) {
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([user, value]) => {
    if (value < 0) debtors.push({ user, value: -value });
    if (value > 0) creditors.push({ user, value });
  });

  const transactions = [];

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];

    const amount = Math.min(d.value, c.value);

    transactions.push({
      from: d.user,
      to: c.user,
      amount
    });

    d.value -= amount;
    c.value -= amount;

    if (d.value === 0) i++;
    if (c.value === 0) j++;
  }

  return transactions;
}
