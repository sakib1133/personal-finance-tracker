import { getIndiaMonthKey } from './dateRange.js';
import { addCents, toCents } from './money.js';

export function getCurrentIndiaMonthExpenses(expenses, now = new Date()) {
  const monthKey = getIndiaMonthKey(now);
  return expenses.filter((expense) => expense.date.slice(0, 7) === monthKey);
}

export function groupExpenseCentsByCategory(expenses) {
  const totals = new Map();
  expenses.forEach((expense) => {
    totals.set(
      expense.category,
      addCents(totals.get(expense.category) || 0, toCents(expense.amount))
    );
  });
  return totals;
}

export function calculateBudgetSummaryCents(budgets, expenses, now = new Date()) {
  const spendingByCategoryCents = groupExpenseCentsByCategory(
    getCurrentIndiaMonthExpenses(expenses, now)
  );
  let totalSpendingCents = 0;
  for (const budget of budgets) {
    totalSpendingCents = addCents(
      totalSpendingCents,
      spendingByCategoryCents.get(budget.category) || 0
    );
  }
  const totalBudgetCents = budgets.reduce(
    (sum, budget) => addCents(sum, toCents(budget.monthlyBudget)),
    0
  );

  return {
    totalBudgetCents,
    totalSpendingCents,
    remainingBudgetCents: totalBudgetCents - totalSpendingCents,
    spendingByCategoryCents
  };
}
