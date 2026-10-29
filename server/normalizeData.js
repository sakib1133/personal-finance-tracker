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

const MONEY_FIELDS = new Set([
  'amount',
  'monthly_budget',
  'monthlyBudget',
  'current_month_spending',
  'previous_month_spending',
  'total',
  'totalExpenses',
  'averageExpenseAmount',
  'highestSingleExpense',
  'lowestExpense',
  'currentMonthSpending',
  'previousMonthSpending',
  'selectedPeriodSpending',
  'previousPeriodSpending',
  'totalSpending',
  'averageDailySpending'
]);

function normalizeResponseData(data, fieldName) {
  if (Array.isArray(data)) {
    return data.map((value) => normalizeResponseData(value));
  }

  // IMPORTANT FIX
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        normalizeResponseData(value, key)
      ])
    );
  }

  return MONEY_FIELDS.has(fieldName) ? normalizeValue(data) : data;
}

function normalizeExpense(expense) {
  return {
    ...expense,
    amount: normalizeValue(expense.amount)
  };
}

function normalizeBudget(budget) {
  return {
    ...budget,
    monthly_budget: normalizeValue(budget.monthly_budget)
  };
}

module.exports = {
  normalizeValue,
  normalizeResponseData,
  normalizeExpense,
  normalizeBudget
};