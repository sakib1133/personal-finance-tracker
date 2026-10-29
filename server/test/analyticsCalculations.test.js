const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCategoryBreakdown,
  buildDailySpending,
  buildMonthlyTrends,
  addCents,
  sumExpenseCents
} = require('../analyticsCalculations');

test('analytics sums currency values in cents without floating-point drift', () => {
  const expenses = [
    { amount: 0.1 },
    { amount: 0.2 },
    { amount: 0.3 }
  ];

  assert.equal(sumExpenseCents(expenses) / 100, 0.6);
});

test('monthly trends include every month and sum only matching expenses', () => {
  const trends = buildMonthlyTrends([
    { date: '2026-01-31', amount: 10.1 },
    { date: '2026-02-01', amount: 0.2 },
    { date: '2026-02-28', amount: 0.3 }
  ], { startDate: '2026-01-15', endDate: '2026-02-28' });

  assert.deepEqual(trends, [
    { month: 'Jan 26', totalSpending: 10.1 },
    { month: 'Feb 26', totalSpending: 0.5 }
  ]);
});

test('category breakdown totals and percentages use exact cent sums', () => {
  const breakdown = buildCategoryBreakdown([
    { category: 'Food', amount: 0.1 },
    { category: 'Food', amount: 0.2 },
    { category: 'Travel', amount: 0.3 }
  ]);

  assert.deepEqual(breakdown, [
    { category: 'Food', amount: 0.3, percentage: 50 },
    { category: 'Travel', amount: 0.3, percentage: 50 }
  ]);
});

test('daily spending keeps the ISO date for unambiguous tooltip detail', () => {
  const result = buildDailySpending([
    { date: '2025-10-27', amount: 12.1 },
    { date: '2026-10-27', amount: 0.2 },
    { date: '2026-10-28', amount: 0.3 }
  ], { startDate: '2026-10-27', endDate: '2026-10-28' });

  assert.deepEqual(result.dailyData, [
    { date: '2026-10-27', day: 'Oct 27', amount: 0.2 },
    { date: '2026-10-28', day: 'Oct 28', amount: 0.3 }
  ]);
  assert.deepEqual(result.highestSpendingDay, {
    date: '2026-10-28',
    day: 'Oct 28',
    amount: 0.3
  });
  assert.equal(result.averageDailySpending, 0.25);
});

test('daily spending defaults to the current India month', () => {
  const result = buildDailySpending([
    { date: '2026-09-30', amount: 99 },
    { date: '2026-10-01', amount: 0.1 },
    { date: '2026-10-31', amount: 0.2 }
  ], null, new Date('2026-10-27T23:00:00Z'));

  assert.equal(result.dailyData.length, 31);
  assert.equal(result.dailyData[0].date, '2026-10-01');
  assert.equal(result.dailyData[30].date, '2026-10-31');
  assert.equal(result.averageDailySpending, 0.01);
});

test('default reports use the India month when UTC is still in the prior month', () => {
  const now = new Date('2026-09-30T20:00:00Z');
  const expenses = [
    { date: '2026-09-30', amount: '20.00' },
    { date: '2026-10-01', amount: '0.10' }
  ];

  const daily = buildDailySpending(expenses, null, now);
  assert.equal(daily.dailyData[0].date, '2026-10-01');
  assert.equal(daily.dailyData.length, 31);

  const monthly = buildMonthlyTrends(expenses, null, now);
  assert.deepEqual(monthly.slice(-2), [
    { month: 'Sep 26', totalSpending: 20 },
    { month: 'Oct 26', totalSpending: 0.1 }
  ]);
});

test('analytics rejects invalid monetary precision instead of silently counting it as zero', () => {
  assert.throws(() => sumExpenseCents([{ amount: '1.234' }]), /two decimal places/);
  assert.throws(() => addCents(Number.MAX_SAFE_INTEGER, 1), /safe integer range/);
});
