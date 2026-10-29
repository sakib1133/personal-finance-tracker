import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetSummaryCents,
  getCurrentIndiaMonthExpenses,
  groupExpenseCentsByCategory
} from '../src/utils/finance.js';

const expenses = [
  { date: '2026-09-30', category: 'Food', amount: '99999999.99' },
  { date: '2026-10-01', category: 'Food', amount: '0.10' },
  { date: '2026-10-31', category: 'Food', amount: '0.20' },
  { date: '2026-11-01', category: 'Bills', amount: '15.00' }
];

test('India month filtering uses date-only values without local timezone shifts', () => {
  const now = new Date('2026-09-30T20:00:00Z');
  assert.deepEqual(
    getCurrentIndiaMonthExpenses(expenses, now).map((expense) => expense.date),
    ['2026-10-01', '2026-10-31']
  );
});

test('category and budget totals sum in cents with overspending preserved', () => {
  const currentMonth = getCurrentIndiaMonthExpenses(expenses, new Date('2026-10-27T00:00:00Z'));
  const categoryTotals = groupExpenseCentsByCategory(currentMonth);
  assert.equal(categoryTotals.get('Food'), 30);

  const result = calculateBudgetSummaryCents(
    [
      { category: 'Food', monthlyBudget: '0.20' },
      { category: 'Bills', monthlyBudget: '1.00' }
    ],
    expenses,
    new Date('2026-10-27T00:00:00Z')
  );
  assert.equal(result.totalBudgetCents, 120);
  assert.equal(result.totalSpendingCents, 30);
  assert.equal(result.remainingBudgetCents, 90);
});
