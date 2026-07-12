function normalizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const normalized = trimmed.replace(/,/g, '');
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return value;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeResponseData(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeResponseData);
  }

  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, normalizeResponseData(value)])
    );
  }

  return normalizeValue(data);
}

function normalizeExpense(expense) {
  return {
    ...expense,
    amount: normalizeValue(expense.amount),
    created_at: expense.created_at,
    updated_at: expense.updated_at,
    user_id: expense.user_id
  };
}

function normalizeBudget(budget) {
  return {
    ...budget,
    monthly_budget: normalizeValue(budget.monthly_budget),
    created_at: budget.created_at,
    updated_at: budget.updated_at,
    user_id: budget.user_id
  };
}

module.exports = {
  normalizeValue,
  normalizeResponseData,
  normalizeExpense,
  normalizeBudget
};
