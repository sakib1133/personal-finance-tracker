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
  'averageDailySpending',
  'Budget',
  'Spending'
]);

const normalizeMoneyValue = (value) => {
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
};

export const normalizeResponseData = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeResponseData);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        typeof entryValue === 'string' && MONEY_FIELDS.has(key)
          ? normalizeMoneyValue(entryValue)
          : normalizeResponseData(entryValue)
      ])
    );
  }

  return value;
};
